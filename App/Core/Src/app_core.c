/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file    app_core.c
  * @brief   PSFB power stage control + telemetry/host protocol.
  *          Fast sampling: HRTIM TIM C runs at 24x master frequency,
  *          producing 24 ADC trigger events per switching period via
  *          (MASTER_CMP1 || TIMC_PERIOD) -> HRTIM ADC trigger 1, which
  *          fires both ADC1 (Vsec, Vpri @ 12-bit) and ADC2
  *          (Ipri_ac, Isec, Ipri_dc @ 8-bit). Circular DMA buffers are
  *          sized exactly to one period of samples, so buffer position
  *          and switching phase stay aligned automatically once started.
  *          Slow sampling: HRTIM TIM E runs at 16x master frequency
  *          (reset by MASTER_CMP1). (MASTER_CMP1 || TIMER E_PERIOD) drives
  *          ADC trigger 3 (postscaler 0) firing ADC3 (Aux12) + ADC4
  *          (Aux5, Mos-NTC) 16x per period. ADC trigger 2 is driven by
  *          TIM D at 10x (postscaler 10 -> 1 in 11) firing ADC5 (internal
  *          temp, Vrefint); its 16 samples spread across ~17.6 periods at
  *          0%..90% phase to average out EMI. All slow sample counts are
  *          powers of two so the means are right-shifts, not divides; the
  *          slow DMA buffers are 16x sized and period-aligned like the
  *          fast ones.
  *          ALL physical-value conversion (incl. Vref/Vcc, aux rails,
  *          temperatures) happens inside every control ISR for sync/safety;
  *          the main loop never derives a physical quantity.
  *          Per-signal feedback derivation in the control ISR:
  *            VSEC      - 12-pair anti-phase mean with clamp-aware
  *                        exclusion (PSFB EMI cancels in 180-deg pairs);
  *                        all-zero buffer -> 0 (low-V/high-I EMI case)
  *            VPRI      - two-point interpolation at fixed phase
  *            IPRI_AC   - per-period peak (rectified CT, MOS protection)
  *            ISEC      - 24-point arithmetic mean (DC-like signal)
  *            IPRI_DC   - 24-point arithmetic mean (ACS712 quasi-DC)
  *            AUX/TEMP  - per-period mean (16) -> 16-period moving-avg ring
  *            VREF/TINT - 16-sample (over ~17.6 periods) arithmetic mean
  ******************************************************************************
  */
/* USER CODE END Header */

#include "app_core.h"

#include "app_protocol.h"
#include "config_manager.h"
#include "calibration.h"
#include "adc.h"
#include "hrtim.h"
#include "comp.h"
#include "dac.h"
#include "iwdg.h"
#include "tim.h"
#include "mos_ntc_lut.h"
#include "usart.h"
#include "stm32g4xx_ll_adc.h"
#include <math.h>
#include <string.h>

/* ===== Protocol ===== */
#define APP_UART_RX_DMA_LEN           96U
#define APP_UART_RX_FIFO_LEN          192U
#define APP_HEARTBEAT_INTERVAL_MS     50U  /* ~20 Hz */

/* ===== Limits ===== */
#define APP_LEAD_RAW                  48U

#define APP_MAX_CV_MV                 2200000UL
#define APP_MAX_CC_MA                 200UL
#define APP_MAX_CP_MW                 400000UL

#define APP_FREQ_MIN_HZ               11000UL
#define APP_FREQ_MAX_HZ               45000UL
#define APP_TRANSFORMER_RATIO         100UL
#define APP_ADC1_FULL_SCALE           4095UL  /* 12-bit */
#define APP_ADC2_FULL_SCALE           255UL   /* 8-bit  */

/* Automatic frequency modulation. TIM7 runs this slow supervisor at 10 ms; it
 * only prepares a reload plan. The HRTIM master ISR consumes that plan at the
 * switching-period boundary and performs the actual register writes. */
#define APP_FREQ_FF_HALF_PI                   1.57079632679f
#define APP_FREQ_FF_TWO_OVER_PI               0.63661977237f

/* ACS712 IPRI_DC zero-current output. Measured to be a precise 2.5 V,
 * independent of the 5 V rail (not AUX_5V/2 as previously assumed). */
#define APP_IPRI_DC_ZERO_MV           2500UL

/* The ACS712 is a Hall sensor with limited bandwidth, so IPRI_DC's per-period
 * 24-point mean is further smoothed over 8 switching periods (moving average,
 * like the AUX rails). Window is a power of two -> the mean is a right shift. */
#define APP_IPRI_DC_AVG_CYCLES        8U
#define APP_IPRI_DC_AVG_SHIFT         3U   /* log2(APP_IPRI_DC_AVG_CYCLES) */
#define APP_IPRI_DC_AVG_MASK          (APP_IPRI_DC_AVG_CYCLES - 1U)

#define APP_PI_MIN                    0.0f
#define APP_PI_MAX                    1.0f

/* Soft-start: the applied phase-shift duty may climb by at most this absolute
 * (normalized 0..1) step per control ISR; falls are unrestricted. Hard limit on
 * EVERY path -- closed-loop PI, fixed-duty debug, and the post-frequency-change
 * feed-forward all ramp through it. 0.10 -> a 0..100% rise takes >=10 switching
 * periods. When the cap binds, all PI integrals are frozen that ISR (anti-windup). */
#define APP_RUN_CONTINUOUS            0xFFFFU

#define APP_ADC_CLOCK_HZ              42500000UL  /* 170 MHz / 4 */
#define APP_HRTIM_TIMC_BASE_CLK_HZ    5440000000ULL  /* MUL32 (TIM C/D/E) */
#define APP_HRTIM_MASTER_BASE_CLK_HZ  680000000UL    /* MUL4  (master/A/B), fixed */

#define APP_OUTPUTS_ALL               (HRTIM_OUTPUT_TA1 | HRTIM_OUTPUT_TA2 | \
                                       HRTIM_OUTPUT_TB1 | HRTIM_OUTPUT_TB2)
#define APP_TIMERS_ALL                (HRTIM_TIMERID_MASTER | HRTIM_TIMERID_TIMER_A | \
                                       HRTIM_TIMERID_TIMER_B | HRTIM_TIMERID_TIMER_C | \
                                       HRTIM_TIMERID_TIMER_D | HRTIM_TIMERID_TIMER_E)
#define APP_TIMER_UPDATES_ALL         (HRTIM_TIMERUPDATE_MASTER | HRTIM_TIMERUPDATE_A | \
                                       HRTIM_TIMERUPDATE_B | HRTIM_TIMERUPDATE_C | \
                                       HRTIM_TIMERUPDATE_D | HRTIM_TIMERUPDATE_E)

#define APP_STATUS_BIT_ENABLED        0x01U
#define APP_STATUS_BIT_MODE_MASK      0x06U
#define APP_STATUS_BIT_CONFIG_OK      0x08U
#define APP_STATUS_BIT_FIXED_DUTY     0x10U
#define APP_STATUS_BIT_OCP            0x20U  /* overcurrent protection latched, output off */
#define APP_STATUS_BIT_WDG_RESET      0x40U  /* last MCU reset was caused by the IWDG */
#define APP_STATUS_BIT_OTP            0x80U  /* over-temperature protection latched, output off */

/* Hardware overcurrent protection: COMP1 compares the rectified IPRI_AC CT
 * voltage (PA1) against a DAC1 threshold; on trip the HRTIM FLT4 input forces
 * TA/TB to the inactive (off) state asynchronously. Release firmware trips at
 * 60 A to keep the public build conservative.
 * IPRI_AC scaling is i_ma = mv * 400/15 (1:200 CT + 7.5R burden), so the
 * threshold voltage for the trip current is mv = trip_A * 1000 * 15/400. */
#define APP_OCP_TRIP_A                60UL
#define APP_OCP_TRIP_MV               ((APP_OCP_TRIP_A * 1000UL * 15UL) / 400UL)  /* 2250 mV */

/* Software over-temperature protection: the control ISR forces the output off
 * and latches (sticky until host re-enable, like OCP) when either the MOS NTC
 * (g_mos_temp_mc) or the MCU internal sensor (g_internal_temp_mc) exceeds
 * APP_OTP_TRIP_MC. Both are refreshed every control ISR by process_slow_adc_isr().
 * Unlike OCP there is no hardware fault path, so the ISR stops the gate drive
 * itself on the trip edge. */
#define APP_OTP_TRIP_MC               70000UL  /* 70 C, MOS or MCU internal sensor */

/* Internal supply UVLO/OVP gate inhibit. This protection intentionally does
 * not change the host protocol state: software enable may remain latched while
 * the actual HRTIM outputs are held off. Decisions are made from the filtered
 * per-ISR physical values. */
#define APP_SUPPLY_PROTECT_TRIP_CYCLES        30U
#define APP_SUPPLY_PROTECT_RECOVER_CYCLES     10U
#define APP_SUPPLY_BUS_OVP_MV                 32000UL
#define APP_SUPPLY_AUX12_UVLO_MV              8000UL
#define APP_SUPPLY_AUX12_OVP_MV               15000UL
#define APP_SUPPLY_AUX5_UVLO_MV               3700UL
#define APP_SUPPLY_AUX5_OVP_MV                6500UL
#define APP_SUPPLY_VCC_UVLO_MV                2700UL
#define APP_SUPPLY_VCC_OVP_MV                 4200UL

/* Watchdog liveness: TIM6 fires every 10 ms and refreshes the IWDG only while
 * BOTH the main loop and the control ISR keep tagging the activity flag. After
 * APP_WDG_MISS_LIMIT consecutive 10 ms ticks with either path silent (=100 ms)
 * the refresh stops and the IWDG (~200 ms) resets the MCU. */
#define APP_WDG_FLAG_LOOP             0x01U
#define APP_WDG_FLAG_ISR              0x02U
#define APP_WDG_MISS_LIMIT            10U

/* ===== Sampling layout =====
 * One master switching period contains APP_SAMPLES_PER_PERIOD ADC trigger
 * events. Each event runs the full ADC1 / ADC2 regular sequence; DMA
 * appends results to a circular buffer sized exactly to one period.
 *   adc1_dma[k*APP_ADC1_CHANNELS + r] = ADC1 rank r, sample slot k
 *   adc2_dma[k*APP_ADC2_CHANNELS + r] = ADC2 rank r, sample slot k
 * Slot k corresponds (approximately) to time MASTER_CMP1 + k * (PRD / 24).
 */
#define APP_SAMPLES_PER_PERIOD        24U
#define APP_ADC1_CHANNELS             2U
#define APP_ADC2_CHANNELS             3U
#define APP_ADC1_BUFFER_LEN           (APP_ADC1_CHANNELS * APP_SAMPLES_PER_PERIOD)  /* 48 */
#define APP_ADC2_BUFFER_LEN           (APP_ADC2_CHANNELS * APP_SAMPLES_PER_PERIOD)  /* 72 */

/* ===== Slow auxiliary sampling layout =====
 * ADC3/ADC4 hang on ADC trigger 3, now driven by HRTIM TIM E at 16x master
 * (fires on every TIM E event) -> APP_SLOW_SAMPLES_PER_PERIOD (=16)
 * samples/channel per switching period, interval = T_sw / 16. ADC5 hangs on
 * ADC trigger 2, driven by TIM D at 10x master with postscaler 10 (1 in
 * every 11 events); its APP_VREF_SAMPLES (=16) samples accumulate across
 * ~17.6 periods, still sweeping the 0%..90% phases (10 and 11 coprime) to
 * average out EMI. All slow sample counts are now powers of two, so every
 * per-period / per-window mean is a pure right shift instead of a divide
 * (see the *_SHIFT macros). Buffers are armed before the HRTIM starts; for
 * the ADC3/4 chain slot k == phase ~k/16 of the period. The control ISR
 * processes this buffer every switching period so the moving-average ring
 * contains consecutive per-period means. */
#define APP_SLOW_SAMPLES_PER_PERIOD   16U  /* ADC3/4 samples/period (TIM E, 16x) */
#define APP_SLOW_SAMPLES_SHIFT        4U   /* log2(APP_SLOW_SAMPLES_PER_PERIOD) */
#define APP_SLOW_AVG_CYCLES           16U  /* per-period means kept in the ring */
#define APP_SLOW_AVG_SHIFT            4U   /* log2(APP_SLOW_AVG_CYCLES) */
#define APP_SLOW_AVG_MASK             (APP_SLOW_AVG_CYCLES - 1U)
#define APP_VREF_SAMPLES              16U  /* ADC5 (VREFINT / internal temp) samples */
#define APP_VREF_SAMPLES_SHIFT        4U   /* log2(APP_VREF_SAMPLES) */
#define APP_TIMD_EVENTS_PER_PERIOD    10U  /* TIM D rate for the ADC5 trigger (10x) */
#define APP_ADC3_CHANNELS             1U   /* AUX12 */
#define APP_ADC4_CHANNELS             2U   /* AUX5, MOS-NTC */
#define APP_ADC5_CHANNELS             2U   /* internal temp, VREFINT */
#define APP_ADC3_BUFFER_LEN           (APP_ADC3_CHANNELS * APP_SLOW_SAMPLES_PER_PERIOD)  /* 16 */
#define APP_ADC4_BUFFER_LEN           (APP_ADC4_CHANNELS * APP_SLOW_SAMPLES_PER_PERIOD)  /* 32 */
#define APP_ADC5_BUFFER_LEN           (APP_ADC5_CHANNELS * APP_VREF_SAMPLES)             /* 32 */

/* ADC1 ranks */
#define APP_ADC1_RANK_VSEC            0U
#define APP_ADC1_RANK_VPRI            1U
/* ADC2 ranks (see G474_HVCCPS.ioc) */
#define APP_ADC2_RANK_IPRI_AC         0U
#define APP_ADC2_RANK_ISEC            1U
#define APP_ADC2_RANK_IPRI_DC         2U
/* ADC3/4/5 ranks (slow chain, see G474_HVCCPS.ioc) */
#define APP_ADC3_RANK_AUX12           0U
#define APP_ADC4_RANK_AUX5            0U
#define APP_ADC4_RANK_MOS_NTC         1U
#define APP_ADC5_RANK_INT_TEMP        0U
#define APP_ADC5_RANK_VREFINT         1U

typedef enum
{
  APP_MODE_DISABLED = 0,
  APP_MODE_CC = 1,
  APP_MODE_CV = 2,
  APP_MODE_CP = 3
} APP_ControlMode;

typedef struct
{
  float value;
  float integral;
} APP_PIState;

typedef struct
{
  uint32_t prd;             /* master/A/B period in MUL4 ticks at the active freq */
  uint32_t actual_freq_hz;  /* realized switching frequency = MUL4 clock / prd */
  uint32_t phase_max_raw;   /* APP_LEAD_RAW + prd/2: duty=1 phase compare clamp */
  float phase_span_f;       /* (float)(prd/2): duty<->raw scale used by set_duty() */
  float inv_span_f;         /* 1/(prd/2): set_duty() recovers app.duty without a divide */
} APP_DerivedConfig;

typedef struct
{
  uint32_t freq_hz;
  uint32_t prd;
  uint32_t timc_prd;
  uint32_t timd_prd;
  uint32_t time_prd;
  uint32_t actual_freq_hz;
  uint32_t phase_max_raw;
  float phase_span_f;
  float inv_span_f;
  float feedforward_duty;
  uint16_t feedforward_mcmp3_raw;
} APP_FreqReloadPlan;

typedef struct
{
  uint32_t cv_target_mv;
  uint32_t cc_target_ma;
  uint32_t cp_target_mw;
  uint8_t power_enable_latched;
  uint8_t fixed_duty_active;
  uint8_t config_ok;
  uint8_t ocp_latched;          /* hardware overcurrent tripped; sticky until re-enable */
  uint8_t otp_latched;          /* over-temperature tripped; sticky until re-enable */
  float fixed_duty_value;
  APP_ControlMode mode;
  float duty;
  APP_PIState cv;
  APP_PIState cc;
  APP_PIState cp;
  uint16_t mcmp3_raw;
  uint32_t run_started_tick;
  uint16_t run_duration_s;
  uint16_t run_seconds_remaining;
} APP_ControlState;

/* ===== Globals exposed to telemetry ===== */
volatile uint32_t g_i_pri_ac_ma;
volatile uint32_t g_i_sec_dc_ma;
volatile uint32_t g_i_pri_dc_ma;
volatile uint32_t g_v_pri_dc_mv;
volatile uint32_t g_v_sec_dc_mv;
/* Pre-calibration secondary readings, kept for telemetry/debug so the host can
 * compare the raw ADC conversion against the calibrated feedback. */
volatile uint32_t g_v_sec_dc_mv_raw;
volatile uint32_t g_i_sec_dc_ma_raw;
volatile uint32_t g_aux_12v_mv;
volatile uint32_t g_aux_5v_mv;
volatile uint32_t g_vcc_mv = 3300U;
volatile uint32_t g_mos_temp_mc;
volatile uint32_t g_internal_temp_mc;

/* Factory ADC calibration constants (system memory @0x1FFF75xx, fixed per
 * chip). Cached once at init so the per-ISR VREF/temperature conversions
 * don't re-read system memory or recompute the constant terms. Equivalent
 * to the __LL_ADC_CALC_* helper macros, just with the invariants hoisted. */
static uint32_t vrefint_cal_x3000;  /* *VREFINT_CAL_ADDR * VREFINT_CAL_VREF       */
static int32_t  ts_cal1;            /* *TEMPSENSOR_CAL1_ADDR                       */
static int32_t  ts_span;            /* *TEMPSENSOR_CAL2_ADDR - *TEMPSENSOR_CAL1_ADDR */
static uint8_t  ts_cal_valid;       /* ts_span != 0 (matches the macro's guard)   */

/* DMA-backed sample buffers. Sized to one period of samples so the
 * circular write head naturally re-aligns with the start of each period
 * (no manual rotation needed). Reads in APP_HRTIM_ControlISR and the
 * heartbeat builder are non-atomic by design (per the upgrade spec). */
static volatile uint16_t adc1_dma[APP_ADC1_BUFFER_LEN];
static volatile uint16_t adc2_dma[APP_ADC2_BUFFER_LEN];
static volatile uint16_t adc3_dma[APP_ADC3_BUFFER_LEN];
static volatile uint16_t adc4_dma[APP_ADC4_BUFFER_LEN];
static volatile uint16_t adc5_dma[APP_ADC5_BUFFER_LEN];

static uint8_t uart_rx_dma[APP_UART_RX_DMA_LEN];
static uint8_t uart_rx_fifo[APP_UART_RX_FIFO_LEN];
static volatile uint16_t uart_rx_head;
static volatile uint16_t uart_rx_tail;
static volatile uint8_t uart_rx_restart_pending;
/* Heartbeat TX buffer sized to the largest layout we currently build. */
#define APP_HEARTBEAT_TX_CAPACITY     320U
static uint8_t uart_tx_frame[APP_HEARTBEAT_TX_CAPACITY];
static volatile uint8_t uart_tx_busy;
static uint8_t config_tx_pending;
static uint16_t config_tx_len;
static uint8_t config_tx_frame[APP_CONFIG_RESPONSE_MAX_LEN];
static uint8_t cal_tx_pending;
static uint8_t cal_tx_frame[APP_CAL_RESPONSE_LEN];

static APP_ControlState app;
static APP_DerivedConfig g_derived;
static volatile APP_FreqReloadPlan g_freq_reload_plan;
static volatile uint8_t g_freq_reload_pending;
static uint32_t g_current_freq_hz;
static float freq_ctrl_duty_filt;
static float freq_ctrl_down_score;
static float freq_ctrl_up_score;
static uint16_t freq_ctrl_lockout_ticks;
static uint32_t hrtim_irq_count;
static uint32_t heartbeat_last_tick;
/* The control ISR only accumulates the three physical values that need
 * heartbeat-window averaging. build_heartbeat() snapshots and clears these
 * counters in a short critical section, then performs the 64/32-bit divisions
 * in main-loop context where the control IRQ can preempt them. */
static volatile uint64_t heartbeat_v_sec_mv_sum;
static volatile uint64_t heartbeat_i_sec_ma_sum;
static volatile uint64_t heartbeat_i_pri_dc_ma_sum;
static volatile uint32_t heartbeat_measurement_count;

/* Watchdog liveness tracking (see APP_WDG_* defines). wdg_activity is OR-ed by
 * the main loop (LOOP bit) and the control ISR (ISR bit); the TIM6 callback
 * samples-and-clears it each 10 ms tick. The two miss counters track how many
 * consecutive ticks each path has been silent. wdg_reset_latched remembers a
 * watchdog-caused reset, read once from RCC at boot and reported to the host. */
static volatile uint8_t wdg_activity;
static uint8_t wdg_loop_miss;
static uint8_t wdg_isr_miss;
static uint8_t wdg_reset_latched;

/* ISR execution-time stats, sourced from DWT->CYCCNT. `last` is the most
 * recent ISR duration in CPU cycles; min/max accumulate over one heartbeat
 * window and are snapshot+reset by build_heartbeat() so the host sees
 * fresh extrema for each window. CPU clock = 170 MHz -> 1 cycle ~= 5.88 ns. */
static volatile uint32_t isr_cycles_last;
static volatile uint32_t isr_cycles_min = 0xFFFFFFFFU;
static volatile uint32_t isr_cycles_max;
static uint8_t psfb_gate_outputs_enabled;
static uint8_t supply_protect_active;
static uint8_t supply_bad_cycles;
static uint8_t supply_good_cycles;

static void apply_active_config(void);
static void restore_base_frequency_when_output_off(void);
static void hrtim_load_periods(uint32_t prd, uint32_t timc_prd,
                               uint32_t timd_prd, uint32_t time_prd);
static void set_hrtim_phase_raw(uint16_t mcmp3_raw);
static void freq_ctrl_reset(uint16_t lockout_ticks);
static void freq_ctrl_consume_pending(float cv_error, float cc_error, float cp_error);
static void reset_controller_state(void);
static void send_pending_config_response(void);
static void send_pending_cal_response(void);
static void app_start_run(uint32_t cv_target_mv, uint32_t cc_target_ma,
                          uint32_t cp_target_mw, uint16_t run_duration_s,
                          uint8_t fixed_duty_active, float fixed_duty_value);
static void app_stop_output(void);
static uint8_t supply_protection_update(uint32_t v_pri_mv);
static void set_psfb_gate_outputs(uint8_t enable);
static void set_software_enable_led(uint8_t enable);

/* ============================ utilities ============================ */

static uint8_t sum8(const uint8_t *data, uint16_t len)
{
  return APP_Protocol_Sum8(data, len);
}

static uint8_t xor8(const uint8_t *data, uint16_t len)
{
  return APP_Protocol_Xor8(data, len);
}

static uint16_t read_le16(const uint8_t *data)
{
  return APP_Protocol_ReadLe16(data);
}

static uint32_t read_le32(const uint8_t *data)
{
  return APP_Protocol_ReadLe32(data);
}

static float read_float(const uint8_t *data)
{
  return APP_Protocol_ReadFloat(data);
}

static void write_le16(uint8_t *data, uint16_t value)
{
  APP_Protocol_WriteLe16(data, value);
}

static void write_le32(uint8_t *data, uint32_t value)
{
  APP_Protocol_WriteLe32(data, value);
}

static void write_float(uint8_t *data, float value)
{
  APP_Protocol_WriteFloat(data, value);
}

static uint32_t clamp_u32(uint32_t value, uint32_t lo, uint32_t hi)
{
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

static float clamp_f(float value, float lo, float hi)
{
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

static uint32_t adc12_to_mv(uint16_t raw)
{
  return ((uint32_t)raw * g_vcc_mv) / APP_ADC1_FULL_SCALE;
}

static uint32_t adc8_to_mv(uint16_t raw)
{
  return ((uint32_t)raw * g_vcc_mv) / APP_ADC2_FULL_SCALE;
}

static uint32_t pi_power_mw(uint32_t mv, uint32_t ma)
{
  /* mv*ma is microwatts; /1000 -> milliwatts. Keep it all 32-bit (no 64-bit
   * multiply/divide in the control ISR) by splitting mv = 1000*vq + vr:
   *   mv*ma/1000 = ma*vq + (ma*vr)/1000,  vr in 0..999.
   * Bit-exact with the old 64-bit form for every in-range V/I. Even taking
   * each operand at its own max (vq<=3300, ma<=25000) both partials stay
   * below ~1e8, i.e. far inside uint32. */
  uint32_t vq = mv / 1000U;          /* whole volts          */
  uint32_t vr = mv - (vq * 1000U);   /* sub-volt mV, 0..999  */
  return (ma * vq) + ((ma * vr) / 1000U);
}

static float pi_frozen_value(APP_PIState *pi, float error, float kp)
{
  return clamp_f((kp * error) + pi->integral, APP_PI_MIN, APP_PI_MAX);
}

static void pi_commit(APP_PIState *pi, float value, float new_integral, uint8_t integrate)
{
  pi->integral = (integrate != 0U) ? new_integral : pi->integral;
  pi->value = value;
}

/* ===================== HRTIM / ADC helpers ===================== */

/* Master/TIM A/TIM B run on a FIXED MUL4 prescaler (680 MHz), so a frequency
 * change is just a new period reload -- no prescaler search, no time-base
 * reconfiguration. MUL4 covers the whole 11..45 kHz rated band inside the
 * 16-bit period register (45 kHz -> 15111, 11 kHz -> 61818, both <= 0xFFDF). */
static uint32_t master_prd_for_freq(uint32_t freq_hz)
{
  return (uint32_t)(APP_HRTIM_MASTER_BASE_CLK_HZ / freq_hz);
}

/* TIM C drives the 24 sample triggers per master period via
 * (MASTER_CMP1 | TIMC_PERIOD). We deliberately set TIM C slightly
 * slower than ideal (floor + 1) so that across one master period the
 * TIM C counter rolls over 23 times, and the 24th would-be overflow
 * lands AFTER the next MASTER_CMP1 reset and gets cut short. That
 * gives exactly 24 ADC trigger events (1 from MASTER_CMP1 + 23 from
 * TIMC_PERIOD). If TIM C were even slightly faster than 24×, we would
 * sneak in a 24th TIMC_PERIOD before the reset and end up with 25
 * triggers per period, overrunning the DMA buffer alignment.
 */
static uint32_t timc_prd_for_freq(uint32_t freq_hz)
{
  return (uint32_t)((APP_HRTIM_TIMC_BASE_CLK_HZ /
                     ((uint64_t)freq_hz * (uint64_t)APP_SAMPLES_PER_PERIOD)) + 1ULL);
}

/* TIM D drives ADC trigger 2 (ADC5: VREFINT / internal temp) at 10x master
 * frequency via (MASTER_CMP1 | TIMD_PERIOD). Same floor+1 trick as TIM C:
 * across one master period the TIM D counter rolls over 9 times, and the 10th
 * would-be overflow lands AFTER the next MASTER_CMP1 reset and is cut short ->
 * exactly 10 trigger events per period (1 from MASTER_CMP1 + 9 from
 * TIMD_PERIOD). ADC5 is postscaled (1-in-11) off this 10x stream. TIM D
 * shares TIM C's MUL32 base clock. */
static uint32_t timd_prd_for_freq(uint32_t freq_hz)
{
  return (uint32_t)((APP_HRTIM_TIMC_BASE_CLK_HZ /
                     ((uint64_t)freq_hz * (uint64_t)APP_TIMD_EVENTS_PER_PERIOD)) + 1ULL);
}

/* TIM E drives ADC trigger 3 (ADC3 AUX12 + ADC4 AUX5/MOS-NTC) at 16x master
 * frequency via (MASTER_CMP1 | TIMER E_PERIOD), postscaler 0. Same floor+1
 * trick -> exactly 16 trigger events per master period (1 from MASTER_CMP1 +
 * 15 from TIMER E_PERIOD), so the slow-sample buffers stay period-aligned with
 * 16 (a power of two) samples per period. Shares TIM C's MUL32 base clock.
 * This is the timer the host frequency change must also re-arm. */
static uint32_t time_prd_for_freq(uint32_t freq_hz)
{
  return (uint32_t)((APP_HRTIM_TIMC_BASE_CLK_HZ /
                     ((uint64_t)freq_hz * (uint64_t)APP_SLOW_SAMPLES_PER_PERIOD)) + 1ULL);
}

static float duty_feedforward_for_freq(float duty, uint32_t old_freq_hz, uint32_t new_freq_hz)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  float s;
  float ratio;

  duty = clamp_f(duty, 0.0f, 1.0f);
  if ((old_freq_hz == 0U) || (new_freq_hz == 0U)) return duty;

  s = sinf(APP_FREQ_FF_HALF_PI * duty);
  ratio = powf(((float)new_freq_hz) / ((float)old_freq_hz), cfg->freq_ff_gamma);
  return APP_FREQ_FF_TWO_OVER_PI * asinf(clamp_f(s * ratio, 0.0f, 1.0f));
}

static uint32_t freq_ctrl_step_hz(uint32_t freq_hz, float severity)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  uint32_t step = (freq_hz * 6UL) / 100UL;  /* proportional 6% baseline */

  if (step < cfg->freq_min_step_hz) step = cfg->freq_min_step_hz;
  if (step > cfg->freq_max_step_hz) step = cfg->freq_max_step_hz;
  if (severity > 15.0f) step = cfg->freq_max_step_hz;
  else if ((severity > 8.0f) && (step < 3000UL)) step = 3000UL;
  else if ((severity > 3.0f) && (step < 2000UL)) step = 2000UL;

  return step;
}

static void freq_ctrl_prepare_reload(uint32_t new_freq_hz, float feedforward_duty)
{
  APP_FreqReloadPlan plan;

  new_freq_hz = clamp_u32(new_freq_hz, APP_FREQ_MIN_HZ, APP_FREQ_MAX_HZ);
  feedforward_duty = clamp_f(feedforward_duty, 0.0f, 1.0f);

  plan.freq_hz = new_freq_hz;
  plan.prd = master_prd_for_freq(new_freq_hz);
  plan.timc_prd = timc_prd_for_freq(new_freq_hz);
  plan.timd_prd = timd_prd_for_freq(new_freq_hz);
  plan.time_prd = time_prd_for_freq(new_freq_hz);
  plan.actual_freq_hz = (uint32_t)((APP_HRTIM_MASTER_BASE_CLK_HZ + (plan.prd / 2U)) / plan.prd);
  plan.phase_max_raw = APP_LEAD_RAW + (plan.prd / 2U);
  plan.phase_span_f = (float)(plan.prd / 2U);
  plan.inv_span_f = 1.0f / plan.phase_span_f;
  plan.feedforward_duty = feedforward_duty;
  plan.feedforward_mcmp3_raw =
    (uint16_t)(APP_LEAD_RAW + (uint32_t)((feedforward_duty * plan.phase_span_f) + 0.5f));

  if (plan.feedforward_mcmp3_raw > plan.phase_max_raw)
  {
    plan.feedforward_mcmp3_raw = (uint16_t)plan.phase_max_raw;
  }

  g_freq_reload_plan = plan;
  g_freq_reload_pending = 1U;
}

static float freq_ctrl_up_trig_pct(uint32_t freq_hz)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  return (((float)freq_hz) / 1000.0f) + cfg->freq_up_trigger_offset_pct;
}

static float freq_ctrl_up_stop_pct(uint32_t freq_hz)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  return (cfg->freq_up_stop_slope * (((float)freq_hz) / 1000.0f)) +
         cfg->freq_up_stop_offset_pct;
}

static uint32_t freq_ctrl_choose_down_freq(uint32_t old_freq_hz, float duty, float severity)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  uint32_t step = freq_ctrl_step_hz(old_freq_hz, severity);
  uint32_t new_freq_hz;
  uint32_t probe;

  if (step > (old_freq_hz - APP_FREQ_MIN_HZ)) step = old_freq_hz - APP_FREQ_MIN_HZ;
  if (step == 0U) return old_freq_hz;

  new_freq_hz = old_freq_hz - step;

  /* If the adaptive step still predicts >90% duty, jump farther so a
   * saturated operating point does not walk down from 35 kHz to 15 kHz over
   * seconds. Limit remains the configured maximum step. */
  for (probe = new_freq_hz;
       (probe >= APP_FREQ_MIN_HZ) && (old_freq_hz - probe <= cfg->freq_max_step_hz);
       probe -= cfg->freq_min_step_hz)
  {
    float pred = duty_feedforward_for_freq(duty, old_freq_hz, probe) * 100.0f;
    new_freq_hz = probe;
    if (pred < cfg->freq_down_stop_pct) break;
    if (probe == APP_FREQ_MIN_HZ) break;
  }

  return new_freq_hz;
}

static uint32_t freq_ctrl_choose_up_freq(uint32_t old_freq_hz, float duty, float severity)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  uint32_t step = freq_ctrl_step_hz(old_freq_hz, severity);
  uint32_t limit = (old_freq_hz + cfg->freq_max_step_hz < APP_FREQ_MAX_HZ) ?
                   (old_freq_hz + cfg->freq_max_step_hz) : APP_FREQ_MAX_HZ;
  uint32_t best = old_freq_hz;
  uint32_t probe;

  if (old_freq_hz + step > APP_FREQ_MAX_HZ) step = APP_FREQ_MAX_HZ - old_freq_hz;
  if (step == 0U) return old_freq_hz;
  best = old_freq_hz + step;

  for (probe = old_freq_hz + cfg->freq_min_step_hz;
       probe <= limit;
       probe += cfg->freq_min_step_hz)
  {
    float pred = duty_feedforward_for_freq(duty, old_freq_hz, probe) * 100.0f;
    if (pred <= cfg->freq_up_pred_limit_pct)
    {
      best = probe;
    }
    else
    {
      break;
    }
    if ((limit - probe) < cfg->freq_min_step_hz) break;
  }

  return best;
}

static void freq_ctrl_reset(uint16_t lockout_ticks)
{
  freq_ctrl_duty_filt = app.duty * 100.0f;
  freq_ctrl_down_score = 0.0f;
  freq_ctrl_up_score = 0.0f;
  freq_ctrl_lockout_ticks = lockout_ticks;
  g_freq_reload_pending = 0U;
}

static void freq_ctrl_apply_score_decay(void)
{
  freq_ctrl_down_score *= 0.50f;
  freq_ctrl_up_score *= 0.50f;
  if (freq_ctrl_down_score < 0.5f) freq_ctrl_down_score = 0.0f;
  if (freq_ctrl_up_score < 0.5f) freq_ctrl_up_score = 0.0f;
}

static void freq_ctrl_score_and_plan(void)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  uint32_t old_freq_hz;
  uint32_t new_freq_hz;
  float duty_pct;
  float up_trig;
  float up_stop;
  float down_margin;
  float up_margin;
  float ff_duty;
  float inc;

  if (g_freq_reload_pending != 0U) return;

  old_freq_hz = g_current_freq_hz;
  duty_pct = app.duty * 100.0f;
  freq_ctrl_duty_filt += cfg->freq_duty_filter_alpha * (duty_pct - freq_ctrl_duty_filt);

  if ((app.power_enable_latched == 0U) || (app.fixed_duty_active != 0U) ||
      (app.ocp_latched != 0U) || (supply_protect_active != 0U) ||
      (cfg->freq_policy != HV_FREQ_POLICY_AUTO) ||
      (old_freq_hz < APP_FREQ_MIN_HZ) ||
      (old_freq_hz > APP_FREQ_MAX_HZ))
  {
    freq_ctrl_reset(0U);
    return;
  }

  if (freq_ctrl_lockout_ticks > 0U)
  {
    freq_ctrl_lockout_ticks--;
    freq_ctrl_apply_score_decay();
    return;
  }

  up_trig = freq_ctrl_up_trig_pct(old_freq_hz);
  up_stop = freq_ctrl_up_stop_pct(old_freq_hz);
  down_margin = freq_ctrl_duty_filt - cfg->freq_down_trigger_pct;
  up_margin = up_trig - freq_ctrl_duty_filt;

  if ((down_margin > 0.0f) && (old_freq_hz > APP_FREQ_MIN_HZ))
  {
    inc = 8.0f + (down_margin * 7.0f);
    if (freq_ctrl_duty_filt > cfg->freq_down_fast_pct) inc += 10.0f;
    if (freq_ctrl_duty_filt > cfg->freq_down_sat_pct) inc += 18.0f;
    freq_ctrl_down_score += inc;
    freq_ctrl_up_score *= 0.35f;
  }
  else if ((up_margin > 0.0f) && (old_freq_hz < APP_FREQ_MAX_HZ))
  {
    inc = 3.5f + (up_margin * 2.0f);
    if (freq_ctrl_duty_filt < (up_trig - 10.0f)) inc += 8.0f;
    freq_ctrl_up_score += inc;
    freq_ctrl_down_score *= 0.35f;
  }
  else
  {
    freq_ctrl_apply_score_decay();
  }

  if (freq_ctrl_down_score >= cfg->freq_score_limit)
  {
    new_freq_hz = freq_ctrl_choose_down_freq(old_freq_hz, freq_ctrl_duty_filt / 100.0f,
                                             freq_ctrl_down_score - cfg->freq_score_limit);
    if (new_freq_hz < old_freq_hz)
    {
      ff_duty = duty_feedforward_for_freq(app.duty, old_freq_hz, new_freq_hz);
      freq_ctrl_prepare_reload(new_freq_hz, ff_duty);
      freq_ctrl_lockout_ticks = (uint16_t)cfg->freq_reload_lockout_ticks;
      freq_ctrl_down_score = 0.0f;
      freq_ctrl_up_score = 0.0f;
    }
  }
  else if ((freq_ctrl_up_score >= cfg->freq_score_limit) &&
           (freq_ctrl_duty_filt < up_stop))
  {
    new_freq_hz = freq_ctrl_choose_up_freq(old_freq_hz, freq_ctrl_duty_filt / 100.0f,
                                           freq_ctrl_up_score - cfg->freq_score_limit);
    if (new_freq_hz > old_freq_hz)
    {
      ff_duty = duty_feedforward_for_freq(app.duty, old_freq_hz, new_freq_hz);
      freq_ctrl_prepare_reload(new_freq_hz, ff_duty);
      freq_ctrl_lockout_ticks = (uint16_t)cfg->freq_reload_lockout_ticks;
      freq_ctrl_down_score = 0.0f;
      freq_ctrl_up_score = 0.0f;
    }
  }
}

static void freq_ctrl_sync_integral(APP_PIState *pi, float error, float kp, float duty)
{
  pi->integral = clamp_f(duty - (kp * error), APP_PI_MIN, APP_PI_MAX);
  pi->value = duty;
}

static void freq_ctrl_consume_pending(float cv_error, float cc_error, float cp_error)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  APP_FreqReloadPlan plan;
  float duty;

  if (g_freq_reload_pending == 0U) return;

  plan = g_freq_reload_plan;
  g_freq_reload_pending = 0U;

  hrtim_load_periods(plan.prd, plan.timc_prd, plan.timd_prd, plan.time_prd);
  app.mcmp3_raw = APP_LEAD_RAW;

  g_current_freq_hz = plan.freq_hz;
  g_derived.prd = plan.prd;
  g_derived.actual_freq_hz = plan.actual_freq_hz;
  g_derived.phase_max_raw = plan.phase_max_raw;
  g_derived.phase_span_f = plan.phase_span_f;
  g_derived.inv_span_f = plan.inv_span_f;

  duty = clamp_f(plan.feedforward_duty, APP_PI_MIN, APP_PI_MAX);
  set_hrtim_phase_raw(plan.feedforward_mcmp3_raw);
  app.duty = ((float)(app.mcmp3_raw - APP_LEAD_RAW)) * g_derived.inv_span_f;

  if (app.mode == APP_MODE_CV) freq_ctrl_sync_integral(&app.cv, cv_error, cfg->kp_cv, duty);
  else if (app.mode == APP_MODE_CC) freq_ctrl_sync_integral(&app.cc, cc_error, cfg->kp_cc, duty);
  else if (app.mode == APP_MODE_CP) freq_ctrl_sync_integral(&app.cp, cp_error, cfg->kp_cp, duty);

  freq_ctrl_duty_filt = app.duty * 100.0f;
  freq_ctrl_down_score = 0.0f;
  freq_ctrl_up_score = 0.0f;
  freq_ctrl_lockout_ticks = (uint16_t)cfg->freq_reload_lockout_ticks;
}

static void reset_controller_state(void)
{
  app.cv.value = 0.0f;
  app.cv.integral = 0.0f;
  app.cc.value = 0.0f;
  app.cc.integral = 0.0f;
  app.cp.value = 0.0f;
  app.cp.integral = 0.0f;
  app.duty = 0.0f;
  set_hrtim_phase_raw(APP_LEAD_RAW);
  freq_ctrl_reset(0U);
}

static void set_psfb_gate_outputs(uint8_t enable)
{
  if (enable != 0U)
  {
    if (psfb_gate_outputs_enabled != 0U) return;
    if (HAL_HRTIM_WaveformOutputStart(&hhrtim1, APP_OUTPUTS_ALL) != HAL_OK) Error_Handler();
    psfb_gate_outputs_enabled = 1U;
  }
  else
  {
    if (psfb_gate_outputs_enabled == 0U) return;
    if (HAL_HRTIM_WaveformOutputStop(&hhrtim1, APP_OUTPUTS_ALL) != HAL_OK) Error_Handler();
    psfb_gate_outputs_enabled = 0U;
  }
}

static void set_software_enable_led(uint8_t enable)
{
  HAL_GPIO_WritePin(LED_B_GPIO_Port, LED_B_Pin,
                    (enable != 0U) ? GPIO_PIN_RESET : GPIO_PIN_SET);
}

static void set_psfb_outputs(uint8_t enable)
{
  if (enable != 0U)
  {
    set_psfb_gate_outputs(1U);
    set_software_enable_led(1U);
  }
  else
  {
    set_psfb_gate_outputs(0U);
    set_software_enable_led(0U);
  }
}

static uint8_t supply_values_out_of_range(uint32_t v_pri_mv)
{
  if (v_pri_mv > APP_SUPPLY_BUS_OVP_MV) return 1U;
  if ((g_aux_12v_mv < APP_SUPPLY_AUX12_UVLO_MV) ||
      (g_aux_12v_mv > APP_SUPPLY_AUX12_OVP_MV)) return 1U;
  if ((g_aux_5v_mv < APP_SUPPLY_AUX5_UVLO_MV) ||
      (g_aux_5v_mv > APP_SUPPLY_AUX5_OVP_MV)) return 1U;
  if ((g_vcc_mv < APP_SUPPLY_VCC_UVLO_MV) ||
      (g_vcc_mv > APP_SUPPLY_VCC_OVP_MV)) return 1U;
  return 0U;
}

static uint8_t supply_protection_update(uint32_t v_pri_mv)
{
  uint8_t bad = supply_values_out_of_range(v_pri_mv);

  if (bad != 0U)
  {
    if (supply_bad_cycles < APP_SUPPLY_PROTECT_TRIP_CYCLES) supply_bad_cycles++;
    supply_good_cycles = 0U;
  }
  else
  {
    supply_bad_cycles = 0U;
    if (supply_good_cycles < APP_SUPPLY_PROTECT_RECOVER_CYCLES) supply_good_cycles++;
  }

  if (supply_protect_active == 0U)
  {
    if (supply_bad_cycles >= APP_SUPPLY_PROTECT_TRIP_CYCLES)
    {
      supply_protect_active = 1U;
      supply_good_cycles = 0U;
      set_psfb_gate_outputs(0U);
      if (app.power_enable_latched != 0U) set_software_enable_led(1U);
      reset_controller_state();
    }
  }
  else
  {
    if ((bad == 0U) && (supply_good_cycles >= APP_SUPPLY_PROTECT_RECOVER_CYCLES))
    {
      const HVCCPS_Config *cfg = ConfigManager_Active();
      supply_protect_active = 0U;
      supply_bad_cycles = 0U;
      reset_controller_state();
      freq_ctrl_reset((uint16_t)cfg->freq_enable_lockout_ticks);
      if ((app.power_enable_latched != 0U) &&
          (app.ocp_latched == 0U) &&
          (app.otp_latched == 0U))
      {
        set_psfb_gate_outputs(1U);
        set_software_enable_led(1U);
      }
    }
  }

  return supply_protect_active;
}

/* Program the COMP1 trip threshold (DAC1 CH1) for APP_OCP_TRIP_MV. The DAC
 * reference is VDDA; using the VREFINT-derived g_vcc_mv keeps the trip at the
 * target current despite supply tolerance. DAC and ADC1 are both 12-bit. */
static void apply_ocp_threshold(void)
{
  uint32_t vref = (g_vcc_mv != 0U) ? g_vcc_mv : 3300U;
  uint32_t code = (APP_OCP_TRIP_MV * APP_ADC1_FULL_SCALE) / vref;
  if (code > APP_ADC1_FULL_SCALE) code = APP_ADC1_FULL_SCALE;
  HAL_DAC_SetValue(&hdac1, DAC_CHANNEL_1, DAC_ALIGN_12B_R, code);
}

/* Drop a latched HRTIM overcurrent fault so the outputs can leave the fault
 * state. The control ISR re-latches app.ocp_latched while FLT4 is asserted, so
 * the flag must be cleared here (output is already off -> current gone). */
static void clear_ocp_fault(void)
{
  __HAL_HRTIM_CLEAR_FLAG(&hhrtim1, HRTIM_FLAG_FLT4);
  app.ocp_latched = 0U;
}

static void set_hrtim_phase_raw(uint16_t mcmp3_raw)
{
  mcmp3_raw = (uint16_t)clamp_u32(mcmp3_raw, APP_LEAD_RAW, g_derived.phase_max_raw);
  if (mcmp3_raw != app.mcmp3_raw)
  {
    __HAL_HRTIM_SETCOMPARE(&hhrtim1, HRTIM_TIMERINDEX_MASTER, HRTIM_COMPAREUNIT_3, mcmp3_raw);
    app.mcmp3_raw = mcmp3_raw;
  }
}

static void set_duty(float duty)
{
  uint16_t raw;

  duty = clamp_f(duty, 0.0f, 1.0f);
  /* phase_span_f = (float)(prd/2), inv_span_f = 1/phase_span_f are cached per
   * frequency change, so the duty<->raw scaling carries no per-ISR integer
   * (prd/2) or float (/span) division. inv_span_f multiply is within ~1 ULP
   * of the old divide; app.duty is telemetry-only so this is immaterial. */
  raw = (uint16_t)(APP_LEAD_RAW + (uint32_t)((duty * g_derived.phase_span_f) + 0.5f));
  set_hrtim_phase_raw(raw);
  app.duty = ((float)(app.mcmp3_raw - APP_LEAD_RAW)) * g_derived.inv_span_f;
}

static void calibrate_adc(ADC_HandleTypeDef *hadc)
{
  if (HAL_ADCEx_Calibration_Start(hadc, ADC_SINGLE_ENDED) != HAL_OK) Error_Handler();
}

static void start_adc_dma(ADC_HandleTypeDef *hadc, volatile uint16_t *buffer, uint32_t length)
{
  if (HAL_ADC_Start_DMA(hadc, (uint32_t *)(void *)buffer, length) != HAL_OK) Error_Handler();
}

static HAL_StatusTypeDef start_uart_rx_dma(void)
{
  HAL_StatusTypeDef status;

  status = HAL_UARTEx_ReceiveToIdle_DMA(&huart3, uart_rx_dma, APP_UART_RX_DMA_LEN);
  if (status == HAL_OK)
  {
    if (huart3.hdmarx != NULL) __HAL_DMA_DISABLE_IT(huart3.hdmarx, DMA_IT_HT);
  }

  return status;
}

static void start_uart_rx(void)
{
  if (start_uart_rx_dma() != HAL_OK) Error_Handler();
}

static void restart_uart_rx(void)
{
  if (start_uart_rx_dma() == HAL_OK)
  {
    uart_rx_restart_pending = 0U;
  }
  else
  {
    uart_rx_restart_pending = 1U;
  }
}

static void push_rx_bytes(const uint8_t *data, uint16_t len)
{
  uint16_t i;
  for (i = 0U; i < len; i++)
  {
    uint16_t next = (uint16_t)((uart_rx_head + 1U) % APP_UART_RX_FIFO_LEN);
    if (next == uart_rx_tail)
    {
      uart_rx_tail = (uint16_t)((uart_rx_tail + 1U) % APP_UART_RX_FIFO_LEN);
    }
    uart_rx_fifo[uart_rx_head] = data[i];
    uart_rx_head = next;
  }
}

static uint16_t rx_available(void)
{
  if (uart_rx_head >= uart_rx_tail) return (uint16_t)(uart_rx_head - uart_rx_tail);
  return (uint16_t)(APP_UART_RX_FIFO_LEN - uart_rx_tail + uart_rx_head);
}

static uint8_t rx_peek(uint16_t offset)
{
  return uart_rx_fifo[(uint16_t)((uart_rx_tail + offset) % APP_UART_RX_FIFO_LEN)];
}

static uint8_t rx_pop(void)
{
  uint8_t value = uart_rx_fifo[uart_rx_tail];
  uart_rx_tail = (uint16_t)((uart_rx_tail + 1U) % APP_UART_RX_FIFO_LEN);
  return value;
}

static void rx_pop_frame(uint8_t *frame, uint16_t len)
{
  uint16_t i;
  for (i = 0U; i < len; i++) frame[i] = rx_pop();
}

/* ===================== HRTIM frequency reload ===================== */

/* A frequency change only rewrites the period reload registers (and the two
 * half-period compares used by the phase-shift legs). Every timer keeps its
 * fixed prescaler (master/A/B = MUL4, C/D/E = MUL32) and all the event/output
 * wiring from MX_HRTIM1_Init. Preload is enabled on every timer and the slave
 * updates are gated to the master update event, so the writes below latch
 * coherently on the next master repetition -- no time-base reconfiguration,
 * dead-time reprogramming, or DMA/timer teardown. Dead time is fixed in
 * absolute ticks (DEAD_TIME) and is therefore frequency-independent. */
static void hrtim_load_periods(uint32_t prd, uint32_t timc_prd,
                               uint32_t timd_prd, uint32_t time_prd)
{
  __HAL_HRTIM_SETPERIOD(&hhrtim1, HRTIM_TIMERINDEX_MASTER,  prd);
  __HAL_HRTIM_SETPERIOD(&hhrtim1, HRTIM_TIMERINDEX_TIMER_A, prd);
  __HAL_HRTIM_SETPERIOD(&hhrtim1, HRTIM_TIMERINDEX_TIMER_B, prd);
  __HAL_HRTIM_SETPERIOD(&hhrtim1, HRTIM_TIMERINDEX_TIMER_C, timc_prd);  /* 24x fast chain  */
  __HAL_HRTIM_SETPERIOD(&hhrtim1, HRTIM_TIMERINDEX_TIMER_D, timd_prd);  /* 10x ADC5 chain  */
  __HAL_HRTIM_SETPERIOD(&hhrtim1, HRTIM_TIMERINDEX_TIMER_E, time_prd);  /* 16x ADC3/4 chain */

  __HAL_HRTIM_SETCOMPARE(&hhrtim1, HRTIM_TIMERINDEX_MASTER,  HRTIM_COMPAREUNIT_1, APP_LEAD_RAW);
  __HAL_HRTIM_SETCOMPARE(&hhrtim1, HRTIM_TIMERINDEX_MASTER,  HRTIM_COMPAREUNIT_3, APP_LEAD_RAW);
  __HAL_HRTIM_SETCOMPARE(&hhrtim1, HRTIM_TIMERINDEX_TIMER_A, HRTIM_COMPAREUNIT_1, prd / 2U);
  __HAL_HRTIM_SETCOMPARE(&hhrtim1, HRTIM_TIMERINDEX_TIMER_B, HRTIM_COMPAREUNIT_1, prd / 2U);
}

static void apply_active_config(void)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  uint32_t freq_hz = cfg->base_freq_hz;
  uint32_t prd      = master_prd_for_freq(freq_hz);
  uint32_t timc_prd = timc_prd_for_freq(freq_hz);
  uint32_t timd_prd = timd_prd_for_freq(freq_hz);
  uint32_t time_prd = time_prd_for_freq(freq_hz);

  /* Fixed-prescaler design: only the period/compare reloads change with
   * frequency, and they latch on the next master repetition via preload (see
   * hrtim_load_periods). The per-period ADC sample counts (24/16/10) are
   * frequency-independent, so the circular DMA buffers stay period-aligned and
   * need no re-arming or teardown. Active configuration is only applied while
   * the output is off, so the control ISR holds duty at 0 during the handover. */
  hrtim_load_periods(prd, timc_prd, timd_prd, time_prd);

  g_current_freq_hz = freq_hz;
  g_derived.prd = prd;
  g_derived.actual_freq_hz = (uint32_t)((APP_HRTIM_MASTER_BASE_CLK_HZ + (prd / 2U)) / prd);
  g_derived.phase_max_raw = APP_LEAD_RAW + (prd / 2U);
  g_derived.phase_span_f = (float)(prd / 2U);
  g_derived.inv_span_f = 1.0f / g_derived.phase_span_f;

  reset_controller_state();
}

static void restore_base_frequency_when_output_off(void)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();

  if ((app.power_enable_latched == 0U) &&
      ((g_current_freq_hz != cfg->base_freq_hz) || (g_freq_reload_pending != 0U)))
  {
    apply_active_config();
  }
}

/* Start (or restart) a run with the given closed-loop targets / fixed duty.
 * Shared by the host ENABLE command and the front-panel key presets so the two
 * entry points stay byte-for-byte identical (fault recovery, soft-start ramp,
 * run-timer arming, frequency lockout). Targets are clamped here, so callers may
 * pass raw values. run_duration_s == 0 means run continuously. */
static void app_start_run(uint32_t cv_target_mv, uint32_t cc_target_ma,
                          uint32_t cp_target_mw, uint16_t run_duration_s,
                          uint8_t fixed_duty_active, float fixed_duty_value)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();

  app.cv_target_mv = clamp_u32(cv_target_mv, 0U, APP_MAX_CV_MV);
  app.cc_target_ma = clamp_u32(cc_target_ma, 0U, APP_MAX_CC_MA);
  app.cp_target_mw = clamp_u32(cp_target_mw, 0U, APP_MAX_CP_MW);

  /* Recover from a latched overcurrent trip: clear the HRTIM fault first so
   * the outputs can re-arm, then proceed exactly like a normal power-on.
   * If the overcurrent persists the fault re-trips on the next switching edge. */
  clear_ocp_fault();
  app.otp_latched = 0U;          /* allow recovery; re-trips next ISR if still hot */
  if (!isfinite(fixed_duty_value)) fixed_duty_value = 0.0f;
  app.fixed_duty_value = clamp_f(fixed_duty_value, 0.0f, 1.0f);
  app.fixed_duty_active = (fixed_duty_active != 0U) ? 1U : 0U;
  app.run_duration_s = run_duration_s;
  app.run_seconds_remaining = (run_duration_s == 0U) ? APP_RUN_CONTINUOUS : run_duration_s;
  app.run_started_tick = HAL_GetTick();
  app.power_enable_latched = 1U;
  if (supply_protect_active != 0U)
  {
    set_duty(0.0f);
    set_psfb_gate_outputs(0U);
    set_software_enable_led(1U);
  }
  else
  {
    set_psfb_outputs(1U);
  }
  freq_ctrl_reset((uint16_t)cfg->freq_enable_lockout_ticks);
}

/* Stop the output and return to the idle/disabled state. Shared by the host
 * DISABLE command, a front-panel key press while running, and the run-timer
 * timeout. Also drops the OCP/OTP latches so the next start is a clean power-on. */
static void app_stop_output(void)
{
  app.power_enable_latched = 0U;
  app.fixed_duty_active = 0U;
  app.mode = APP_MODE_DISABLED;
  app.run_duration_s = 0U;
  app.run_seconds_remaining = 0U;
  set_duty(0.0f);
  set_psfb_outputs(0U);
  clear_ocp_fault();
  app.otp_latched = 0U;          /* drop any over-temperature latch on stop */
  apply_active_config();         /* return runtime frequency to active base frequency */
  freq_ctrl_reset(0U);
}

static void parse_command(const uint8_t *frame)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  uint8_t flags = frame[2];
  uint32_t cv_target_mv = clamp_u32(read_le32(&frame[3]), 0U, APP_MAX_CV_MV);
  uint32_t cc_target_ma = clamp_u32(read_le32(&frame[7]), 0U, APP_MAX_CC_MA);
  uint32_t cp_target_mw = clamp_u32(read_le32(&frame[11]), 0U, APP_MAX_CP_MW);
  uint16_t run_duration_s = read_le16(&frame[15]);
  float fixed_duty = read_float(&frame[17]);

  app.cv_target_mv = cv_target_mv;
  app.cc_target_ma = cc_target_ma;
  app.cp_target_mw = cp_target_mw;
  freq_ctrl_reset((uint16_t)cfg->freq_target_lockout_ticks);

  if ((flags & APP_CMD_BIT_DISABLE) != 0U)
  {
    app_stop_output();
    return;
  }

  if ((flags & APP_CMD_BIT_ENABLE) != 0U)
  {
    app_start_run(cv_target_mv, cc_target_ma, cp_target_mw, run_duration_s,
                  ((flags & APP_CMD_BIT_FIXED_DUTY) != 0U) ? 1U : 0U, fixed_duty);
  }
}

static void build_config_response(const APP_ConfigRequest *request, uint8_t status)
{
  HVCCPS_ConfigSnapshot snapshot;

  ConfigManager_GetSnapshot(&snapshot);
  config_tx_len = APP_Protocol_BuildConfigResponse(config_tx_frame,
                                                   APP_CONFIG_RESPONSE_MAX_LEN,
                                                   request, status, &snapshot);
  if (config_tx_len != 0U)
  {
    config_tx_pending = 1U;
    send_pending_config_response();
  }
}

static void send_pending_config_response(void)
{
  if ((config_tx_pending == 0U) || (uart_tx_busy != 0U) || (config_tx_len == 0U)) return;

  uart_tx_busy = 1U;
  config_tx_pending = 0U;
  if (HAL_UART_Transmit_DMA(&huart3, config_tx_frame, config_tx_len) != HAL_OK)
  {
    uart_tx_busy = 0U;
    config_tx_pending = 1U;
  }
}

static void parse_config_request(const uint8_t *frame)
{
  APP_ConfigRequest request;
  uint8_t status = HV_CONFIG_STATUS_OK;

  if (APP_Protocol_ParseConfigRequest(frame, &request) == 0U) return;

  switch (request.op)
  {
    case APP_CONFIG_OP_GET_SNAPSHOT:
      status = HV_CONFIG_STATUS_OK;
      break;

    case APP_CONFIG_OP_GET_FIELD:
    {
      HVCCPS_ConfigSnapshot snapshot;
      uint8_t value_type;
      uint32_t value_u32;
      float value_f;
      ConfigManager_GetSnapshot(&snapshot);
      status = ConfigManager_GetField((request.target == HV_CONFIG_TARGET_ACTIVE) ?
                                      &snapshot.active : &snapshot.draft,
                                      request.field_id, &value_type, &value_u32, &value_f);
      break;
    }

    case APP_CONFIG_OP_SET_FIELD:
      if (app.power_enable_latched != 0U) status = HV_CONFIG_STATUS_LOCKED;
      else status = ConfigManager_SetDraftField(request.field_id, request.value_type,
                                                request.value_u32, request.value_f);
      break;

    case APP_CONFIG_OP_RESET_FIELD:
      if (app.power_enable_latched != 0U) status = HV_CONFIG_STATUS_LOCKED;
      else status = ConfigManager_ResetDraftField(request.field_id);
      break;

    case APP_CONFIG_OP_APPLY_DRAFT:
      if (app.power_enable_latched != 0U)
      {
        status = HV_CONFIG_STATUS_LOCKED;
      }
      else
      {
        status = ConfigManager_ApplyDraft();
        if (status == HV_CONFIG_STATUS_OK)
        {
          apply_active_config();
          app.config_ok = 1U;
        }
      }
      break;

    case APP_CONFIG_OP_SAVE_DRAFT:
      if (app.power_enable_latched != 0U) status = HV_CONFIG_STATUS_LOCKED;
      else status = ConfigManager_SaveDraftToFlash();
      break;

    case APP_CONFIG_OP_LOAD_FLASH:
      if (app.power_enable_latched != 0U) status = HV_CONFIG_STATUS_LOCKED;
      else status = ConfigManager_LoadFlashToDraft();
      break;

    case APP_CONFIG_OP_LOAD_DEFAULTS:
      if (app.power_enable_latched != 0U) status = HV_CONFIG_STATUS_LOCKED;
      else ConfigManager_LoadDefaultsToDraft();
      break;

    case APP_CONFIG_OP_FACTORY_RESET:
      if (app.power_enable_latched != 0U)
      {
        status = HV_CONFIG_STATUS_LOCKED;
      }
      else
      {
        status = ConfigManager_FactoryResetFlashAndDraft();
        if (status == HV_CONFIG_STATUS_OK) apply_active_config();
      }
      break;

    default:
      status = HV_CONFIG_STATUS_BAD_REQUEST;
      break;
  }

  build_config_response(&request, status);
}

static void send_pending_cal_response(void)
{
  if ((cal_tx_pending == 0U) || (uart_tx_busy != 0U)) return;

  uart_tx_busy = 1U;
  cal_tx_pending = 0U;
  if (HAL_UART_Transmit_DMA(&huart3, cal_tx_frame, APP_CAL_RESPONSE_LEN) != HAL_OK)
  {
    uart_tx_busy = 0U;
    cal_tx_pending = 1U;
  }
}

/* All cal responses share one fixed 26-byte layout: op, status, then the
 * current table info (valid / enable / version / crc / dims / image size /
 * max chunk), so the host learns the device state from every reply. */
static void build_cal_response(uint8_t op, uint8_t status)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  HV_CalInfo info;
  uint16_t off = 0U;

  Calibration_GetInfo(&info);

  cal_tx_frame[off++] = APP_CAL_RESPONSE_HEADER;
  cal_tx_frame[off++] = (uint8_t)APP_CAL_RESPONSE_LEN;
  cal_tx_frame[off++] = op;
  cal_tx_frame[off++] = status;
  cal_tx_frame[off++] = info.valid;
  cal_tx_frame[off++] = (uint8_t)((cfg->cal_enable != 0U) ? 1U : 0U);
  write_le32(&cal_tx_frame[off], info.version); off = (uint16_t)(off + 4U);
  write_le32(&cal_tx_frame[off], info.data_crc); off = (uint16_t)(off + 4U);
  write_le16(&cal_tx_frame[off], info.v_points); off = (uint16_t)(off + 2U);
  write_le16(&cal_tx_frame[off], info.i_points); off = (uint16_t)(off + 2U);
  write_le32(&cal_tx_frame[off], (uint32_t)HV_CAL_IMAGE_BYTES); off = (uint16_t)(off + 4U);
  write_le16(&cal_tx_frame[off], (uint16_t)APP_CAL_MAX_CHUNK); off = (uint16_t)(off + 2U);
  cal_tx_frame[off++] = sum8(cal_tx_frame, (uint16_t)(APP_CAL_RESPONSE_LEN - 2U));
  cal_tx_frame[off++] = xor8(cal_tx_frame, (uint16_t)(APP_CAL_RESPONSE_LEN - 1U));

  cal_tx_pending = 1U;
  send_pending_cal_response();
}

/* Calibration upload handler. Like the config path, flash-touching ops are
 * refused while the output is live (LOCKED) so a table is only ever burned with
 * the gate drive down. */
static void parse_cal_request(const uint8_t *frame, uint8_t flen)
{
  uint8_t op = frame[2];
  uint8_t status = HV_CAL_STATUS_OK;

  switch (op)
  {
    case APP_CAL_OP_BEGIN:
      if (flen < 14U) { status = HV_CAL_STATUS_BAD_REQUEST; break; }
      if (app.power_enable_latched != 0U) { status = HV_CAL_STATUS_LOCKED; break; }
      status = Calibration_StageBegin(read_le32(&frame[4]), read_le32(&frame[8]));
      break;

    case APP_CAL_OP_DATA:
    {
      uint16_t chunk_len;
      if (flen < 12U) { status = HV_CAL_STATUS_BAD_REQUEST; break; }
      if (app.power_enable_latched != 0U) { status = HV_CAL_STATUS_LOCKED; break; }
      chunk_len = read_le16(&frame[8]);
      if ((uint16_t)(chunk_len + 12U) > (uint16_t)flen) { status = HV_CAL_STATUS_BAD_REQUEST; break; }
      status = Calibration_StageData(read_le32(&frame[4]), &frame[10], chunk_len);
      break;
    }

    case APP_CAL_OP_COMMIT:
      if (app.power_enable_latched != 0U) { status = HV_CAL_STATUS_LOCKED; break; }
      status = Calibration_StageCommit();
      break;

    case APP_CAL_OP_GET_INFO:
      status = HV_CAL_STATUS_OK;
      break;

    default:
      status = HV_CAL_STATUS_BAD_REQUEST;
      break;
  }

  build_cal_response(op, status);
}

static void process_rx(void)
{
  uint8_t cmd_frame[APP_COMMAND_LEN];
  uint8_t cfg_frame[APP_CONFIG_REQUEST_LEN];
  uint8_t cal_frame[APP_CAL_REQUEST_MAX_LEN];

  while (rx_available() >= 2U)
  {
    uint8_t header = rx_peek(0U);

    if (header == APP_COMMAND_HEADER)
    {
      if (rx_peek(1U) != APP_COMMAND_LEN)
      {
        (void)rx_pop();
        continue;
      }
      if (rx_available() < APP_COMMAND_LEN) return;
      rx_pop_frame(cmd_frame, APP_COMMAND_LEN);
      if ((cmd_frame[APP_COMMAND_LEN - 2U] != sum8(cmd_frame, APP_COMMAND_LEN - 2U)) ||
          (cmd_frame[APP_COMMAND_LEN - 1U] != xor8(cmd_frame, APP_COMMAND_LEN - 1U))) continue;
      parse_command(cmd_frame);
    }
    else if (header == APP_CONFIG_REQUEST_HEADER)
    {
      if (rx_peek(1U) != APP_CONFIG_REQUEST_LEN)
      {
        (void)rx_pop();
        continue;
      }
      if (rx_available() < APP_CONFIG_REQUEST_LEN) return;
      rx_pop_frame(cfg_frame, APP_CONFIG_REQUEST_LEN);
      if ((cfg_frame[APP_CONFIG_REQUEST_LEN - 2U] != sum8(cfg_frame, APP_CONFIG_REQUEST_LEN - 2U)) ||
          (cfg_frame[APP_CONFIG_REQUEST_LEN - 1U] != xor8(cfg_frame, APP_CONFIG_REQUEST_LEN - 1U))) continue;
      parse_config_request(cfg_frame);
    }
    else if (header == APP_CAL_REQUEST_HEADER)
    {
      uint8_t flen = rx_peek(1U);
      if ((flen < APP_CAL_REQUEST_MIN_LEN) || (flen > APP_CAL_REQUEST_MAX_LEN))
      {
        (void)rx_pop();
        continue;
      }
      if (rx_available() < flen) return;
      rx_pop_frame(cal_frame, flen);
      if ((cal_frame[flen - 2U] != sum8(cal_frame, (uint16_t)(flen - 2U))) ||
          (cal_frame[flen - 1U] != xor8(cal_frame, (uint16_t)(flen - 1U)))) continue;
      parse_cal_request(cal_frame, flen);
    }
    else
    {
      (void)rx_pop();
    }
  }
}

static uint8_t read_key_flags(void)
{
  uint8_t flags = 0U;
  if (HAL_GPIO_ReadPin(KEY_A_GPIO_Port, KEY_A_Pin) == GPIO_PIN_RESET) flags |= 0x01U;
  if (HAL_GPIO_ReadPin(KEY_B_GPIO_Port, KEY_B_Pin) == GPIO_PIN_RESET) flags |= 0x02U;
  return flags;
}

/* ===== Front-panel keys =====
 * KEY_A (PB0) and KEY_B (PA7) are active-low. Each drives a closed-loop run
 * preset held in the active config (btn_a_* / btn_b_*), so the supply runs
 * stand-alone with no host attached. One unified rule on a debounced press edge:
 *   - output already live (key OR host started)   -> stop (panel safety kill);
 *   - else if that key's preset is enabled         -> start its preset run;
 *   - else (preset disabled/unconfigured)          -> ignore.
 * The "stop while live" arm guarantees a physical key always kills the output,
 * even when the host started the run and the serial link later dropped. */
#define APP_KEY_DEBOUNCE_MS           25U

typedef struct
{
  uint8_t raw_prev;     /* last raw sample (1 = pressed) */
  uint8_t stable;       /* debounced state (1 = pressed) */
  uint32_t change_tick; /* HAL tick of the last raw transition */
} APP_KeyDebounce;

static APP_KeyDebounce key_a_db;
static APP_KeyDebounce key_b_db;

/* Advance one key's debounce; return 1 only on a confirmed press edge (0 -> 1). */
static uint8_t key_debounce_pressed(APP_KeyDebounce *db, uint8_t raw, uint32_t now)
{
  if (raw != db->raw_prev)
  {
    db->raw_prev = raw;
    db->change_tick = now;
  }
  if ((raw != db->stable) && ((now - db->change_tick) >= APP_KEY_DEBOUNCE_MS))
  {
    db->stable = raw;
    if (raw != 0U) return 1U;
  }
  return 0U;
}

/* which: 0 = key A, 1 = key B. Reads the preset from the active config. */
static void start_key_preset(uint8_t which)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();

  if (which == 0U)
  {
    if (cfg->btn_a_enable != 0U)
    {
      app_start_run(cfg->btn_a_cv_mv, cfg->btn_a_cc_ma, cfg->btn_a_cp_mw,
                    (uint16_t)cfg->btn_a_time_s, 0U, 0.0f);
    }
  }
  else
  {
    if (cfg->btn_b_enable != 0U)
    {
      app_start_run(cfg->btn_b_cv_mv, cfg->btn_b_cc_ma, cfg->btn_b_cp_mw,
                    (uint16_t)cfg->btn_b_time_s, 0U, 0.0f);
    }
  }
}

static void process_keys(void)
{
  uint32_t now = HAL_GetTick();
  uint8_t raw_a = (HAL_GPIO_ReadPin(KEY_A_GPIO_Port, KEY_A_Pin) == GPIO_PIN_RESET) ? 1U : 0U;
  uint8_t raw_b = (HAL_GPIO_ReadPin(KEY_B_GPIO_Port, KEY_B_Pin) == GPIO_PIN_RESET) ? 1U : 0U;
  uint8_t press_a = key_debounce_pressed(&key_a_db, raw_a, now);
  uint8_t press_b = key_debounce_pressed(&key_b_db, raw_b, now);

  if ((press_a == 0U) && (press_b == 0U)) return;

  /* Any press while the output is live is a stop, regardless of source or which
   * key -- this also safely consumes a simultaneous A+B edge. */
  if (app.power_enable_latched != 0U)
  {
    app_stop_output();
    return;
  }

  /* Output is off: launch the pressed key's preset (A wins if both edged). */
  if (press_a != 0U) start_key_preset(0U);
  else start_key_preset(1U);
}

/* Slow auxiliary signals, processed entirely inside the control ISR for
 * sync/safety (the main loop never derives a physical value).
 *
 * TIM-E 16x chain (AUX12, AUX5, MOS-NTC) -> two-stage filter: average the
 * 16 samples the DMA captured this period into a "per-period mean", push
 * it into a 16-deep ring (overwriting the oldest via a circular index),
 * then average the ring. That is a moving average over 16x16 effective
 * samples using only two 16-element arrays per signal. Both stages are
 * powers of two, so each mean is a right shift, not a divide.
 *
 * VREFINT / internal temp (ADC5, 1-in-11 postscaled on TIM D) -> plain mean
 * of the 16-sample buffer, which spans ~17.6 periods sweeping 0%..90% phase.
 *
 * g_vcc_mv is refreshed first: every adcXX_to_mv() here and in the caller
 * depends on it. (The IPRI_DC zero point is now a fixed 2.5 V constant, no
 * longer AUX_5V/2; g_aux_5v_mv is still computed here for telemetry.) The
 * vref!=0 guard keeps the 3300 mV default until the buffer has real samples.
 *
 * Called once per control ISR so the ring always represents the latest
 * APP_SLOW_AVG_CYCLES consecutive switching periods. */
#if (APP_VREF_SAMPLES != 16U) || (APP_SLOW_SAMPLES_PER_PERIOD != 16U)
#error "process_slow_adc_isr() sums are hand-unrolled for 16 samples; update them."
#endif
static void process_slow_adc_isr(void)
{
  static uint16_t cyc_aux12[APP_SLOW_AVG_CYCLES];
  static uint16_t cyc_aux5[APP_SLOW_AVG_CYCLES];
  static uint16_t cyc_ntc[APP_SLOW_AVG_CYCLES];
  static uint8_t ring_idx;
  /* Moving-average sums kept in lockstep with cyc_* so the ring is never
   * re-summed. Static => zero-initialised, and only this function writes
   * them, so each always equals the running sum of its ring. */
  static uint32_t rsum_aux12;
  static uint32_t rsum_aux5;
  static uint32_t rsum_ntc;

  uint32_t sum_aux12;
  uint32_t sum_aux5;
  uint32_t sum_ntc;
  uint32_t sum_temp;
  uint32_t sum_vref;
  uint32_t vref_avg;
  uint32_t temp_avg;
  int32_t internal_temp_c;
  uint16_t mean_aux12, mean_aux5, mean_ntc;

  /* --- VREFINT / internal temperature: mean of the 16-sample buffer.
   * Hand-unrolled sums (see the 16-sample guard above). --- */
  sum_temp =
      (uint32_t)adc5_dma[ 0U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 1U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 2U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 3U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 4U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 5U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 6U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 7U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 8U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[ 9U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[10U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[11U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[12U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[13U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[14U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP]
    + (uint32_t)adc5_dma[15U * APP_ADC5_CHANNELS + APP_ADC5_RANK_INT_TEMP];
  sum_vref =
      (uint32_t)adc5_dma[ 0U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 1U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 2U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 3U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 4U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 5U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 6U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 7U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 8U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[ 9U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[10U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[11U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[12U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[13U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[14U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT]
    + (uint32_t)adc5_dma[15U * APP_ADC5_CHANNELS + APP_ADC5_RANK_VREFINT];
  vref_avg = (sum_vref + (APP_VREF_SAMPLES / 2U)) >> APP_VREF_SAMPLES_SHIFT;
  temp_avg = (sum_temp + (APP_VREF_SAMPLES / 2U)) >> APP_VREF_SAMPLES_SHIFT;
  if (vref_avg != 0U)
  {
    /* == __LL_ADC_CALC_VREFANALOG_VOLTAGE(vref_avg, 12B): the constant
     * (*VREFINT_CAL_ADDR * VREFINT_CAL_VREF) is cached as vrefint_cal_x3000. */
    g_vcc_mv = vrefint_cal_x3000 / vref_avg;
  }

  /* --- TIM-E 16x chain: per-period mean -> 16-period moving-average ring.
   * Hand-unrolled per-period sums. --- */
  sum_aux12 =
      (uint32_t)adc3_dma[ 0U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 1U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 2U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 3U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 4U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 5U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 6U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 7U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 8U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[ 9U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[10U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[11U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[12U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[13U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[14U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12]
    + (uint32_t)adc3_dma[15U * APP_ADC3_CHANNELS + APP_ADC3_RANK_AUX12];
  sum_aux5 =
      (uint32_t)adc4_dma[ 0U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 1U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 2U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 3U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 4U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 5U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 6U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 7U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 8U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[ 9U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[10U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[11U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[12U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[13U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[14U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5]
    + (uint32_t)adc4_dma[15U * APP_ADC4_CHANNELS + APP_ADC4_RANK_AUX5];
  sum_ntc =
      (uint32_t)adc4_dma[ 0U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 1U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 2U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 3U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 4U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 5U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 6U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 7U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 8U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[ 9U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[10U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[11U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[12U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[13U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[14U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC]
    + (uint32_t)adc4_dma[15U * APP_ADC4_CHANNELS + APP_ADC4_RANK_MOS_NTC];
  mean_aux12 = (uint16_t)((sum_aux12 + (APP_SLOW_SAMPLES_PER_PERIOD / 2U)) >> APP_SLOW_SAMPLES_SHIFT);
  mean_aux5  = (uint16_t)((sum_aux5  + (APP_SLOW_SAMPLES_PER_PERIOD / 2U)) >> APP_SLOW_SAMPLES_SHIFT);
  mean_ntc   = (uint16_t)((sum_ntc   + (APP_SLOW_SAMPLES_PER_PERIOD / 2U)) >> APP_SLOW_SAMPLES_SHIFT);

  /* Roll the moving-average sums: out with the slot we overwrite, in with the
   * new per-period mean. Unsigned wraparound keeps (new - old) correct even
   * when new < old. Result is identical to the old full ring re-sum. */
  rsum_aux12 = rsum_aux12 + (uint32_t)mean_aux12 - (uint32_t)cyc_aux12[ring_idx];
  rsum_aux5  = rsum_aux5  + (uint32_t)mean_aux5  - (uint32_t)cyc_aux5[ring_idx];
  rsum_ntc   = rsum_ntc   + (uint32_t)mean_ntc   - (uint32_t)cyc_ntc[ring_idx];
  cyc_aux12[ring_idx] = mean_aux12;
  cyc_aux5[ring_idx]  = mean_aux5;
  cyc_ntc[ring_idx]   = mean_ntc;
  ring_idx = (uint8_t)((ring_idx + 1U) & APP_SLOW_AVG_MASK);

  sum_aux12 = rsum_aux12;
  sum_aux5  = rsum_aux5;
  sum_ntc   = rsum_ntc;

  /* AUX rails: 16k+1k divider -> x17. MOS NTC: 12-bit raw -> mC LUT. */
  g_aux_12v_mv = adc12_to_mv((uint16_t)((sum_aux12 + (APP_SLOW_AVG_CYCLES / 2U)) >> APP_SLOW_AVG_SHIFT)) * 17U;
  g_aux_5v_mv  = adc12_to_mv((uint16_t)((sum_aux5  + (APP_SLOW_AVG_CYCLES / 2U)) >> APP_SLOW_AVG_SHIFT)) * 17U;
  g_mos_temp_mc = MOS_NTC_TEMP_MC_BY_RAW[(uint16_t)((sum_ntc + (APP_SLOW_AVG_CYCLES / 2U)) >> APP_SLOW_AVG_SHIFT)];

  /* == __LL_ADC_CALC_TEMPERATURE(g_vcc_mv, temp_avg, 12B): TS_CAL1 and the
   * (TS_CAL2 - TS_CAL1) span are cached at init (ts_cal1 / ts_span /
   * ts_cal_valid). Data is already 12-bit, so the macro's resolution rescale
   * is a no-op and is dropped here. */
  if (ts_cal_valid != 0U)
  {
    internal_temp_c =
      ((((int32_t)((temp_avg * g_vcc_mv) / TEMPSENSOR_CAL_VREFANALOG) - ts_cal1)
         * (int32_t)(TEMPSENSOR_CAL2_TEMP - TEMPSENSOR_CAL1_TEMP)) / ts_span)
      + (int32_t)TEMPSENSOR_CAL1_TEMP;
  }
  else
  {
    internal_temp_c = (int32_t)LL_ADC_TEMPERATURE_CALC_ERROR;
  }
  if (internal_temp_c == LL_ADC_TEMPERATURE_CALC_ERROR)
  {
    g_internal_temp_mc = 0U;
  }
  else
  {
    if (internal_temp_c < 0) internal_temp_c = 0;
    g_internal_temp_mc = (uint32_t)internal_temp_c * 1000U;
  }
}

static void update_run_timer(void)
{
  uint32_t now;
  uint32_t elapsed;

  if ((app.power_enable_latched == 0U) || (app.run_duration_s == 0U)) return;

  now = HAL_GetTick();
  elapsed = (now - app.run_started_tick) / 1000U;
  if (elapsed >= (uint32_t)app.run_duration_s)
  {
    app_stop_output();
  }
  else
  {
    app.run_seconds_remaining = (uint16_t)((uint32_t)app.run_duration_s - elapsed);
  }
}

/* VSEC: 12-pair anti-phase mean with clamp-aware exclusion.
 * In PSFB topology EMI satisfies E(t+T/2) = -E(t), so samples in slots
 * i and i+12 carry equal-magnitude opposite-sign EMI on top of v.
 * Each pair (a, b) lands in one of:
 *   (i)   both in (0, 4095)         -> a+b = 2v exactly, push to valid bin
 *   (ii)  one == 0, other in (0,X)  -> negative half clamped; un-clamped
 *                                      side B bounds v above by v <= B/2,
 *                                      push to side bin
 *   (iii) either == 4095            -> positive half saturated; v skewed
 *                                      high or contradictory -> flag
 *   (iv)  both == 0                 -> no information, skip
 * Output: prefer valid mean; else mean(side)/2 as a safe overestimate;
 * else, with no valid/side info, 4095 if any sample saturated (force the
 * loop to back off) or 0 if every sample was 0. The all-zero case is a
 * genuine zero output: at low-V / high-I the divider can read exactly 0
 * under EMI and must NOT be reported as full-scale. The mixing-prohibition
 * theorem (see Todo) guarantees patterns (ii) and (iii) cannot coexist
 * for a slowly-varying v. */
static uint16_t anti_phase_pairwise_mean_vsec(void)
{
  uint32_t valid_sum = 0U;
  uint32_t side_sum = 0U;
  uint8_t valid_cnt = 0U;
  uint8_t side_cnt = 0U;
  uint8_t has_full = 0U;
  uint8_t i;

  for (i = 0U; i < (APP_SAMPLES_PER_PERIOD / 2U); i++)
  {
    uint16_t a = adc1_dma[i * APP_ADC1_CHANNELS + APP_ADC1_RANK_VSEC];
    uint16_t b = adc1_dma[(i + (APP_SAMPLES_PER_PERIOD / 2U)) * APP_ADC1_CHANNELS + APP_ADC1_RANK_VSEC];

    if ((a >= APP_ADC1_FULL_SCALE) || (b >= APP_ADC1_FULL_SCALE))
    {
      has_full = 1U;
    }
    else if ((a == 0U) && (b == 0U))
    {
      /* No information: both clamped, discard pair. */
    }
    else if (a == 0U)
    {
      side_sum += (uint32_t)b;
      side_cnt = (uint8_t)(side_cnt + 1U);
    }
    else if (b == 0U)
    {
      side_sum += (uint32_t)a;
      side_cnt = (uint8_t)(side_cnt + 1U);
    }
    else
    {
      valid_sum += (uint32_t)a + (uint32_t)b;
      valid_cnt = (uint8_t)(valid_cnt + 2U);
    }
  }

  if (valid_cnt > 0U)
  {
    return (uint16_t)((valid_sum + ((uint32_t)valid_cnt / 2U)) / (uint32_t)valid_cnt);
  }
  if ((side_cnt > 0U) && (has_full == 0U))
  {
    return (uint16_t)(side_sum / (2U * (uint32_t)side_cnt));
  }
  /* No valid/side info: saturated -> 4095 (force back-off); otherwise every
   * sample was 0 -> genuine zero (low-V/high-I EMI), report 0 not 4095. */
  if (has_full != 0U) return (uint16_t)APP_ADC1_FULL_SCALE;
  return 0U;
}

/* The 24-point means below are hand-unrolled (buffer[0]+buffer[1]+...), so
 * they assume exactly APP_SAMPLES_PER_PERIOD == 24. Guard it so a change to
 * the sample count fails the build instead of silently summing the wrong set. */
#if (APP_SAMPLES_PER_PERIOD != 24U)
#error "arithmetic_mean24_adc1/2 are hand-unrolled for 24 samples; update them."
#endif

/* 24-point arithmetic mean across one channel of the ADC1 buffer. Used for
 * VPRI (hardware-filtered DC bus) -- same full-period mean as ISEC/IPRI_DC on
 * ADC2. Hand-unrolled sum, no loop. */
static uint16_t arithmetic_mean24_adc1(uint8_t rank)
{
  uint32_t sum =
      (uint32_t)adc1_dma[ 0U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 1U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 2U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 3U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 4U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 5U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 6U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 7U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 8U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[ 9U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[10U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[11U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[12U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[13U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[14U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[15U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[16U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[17U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[18U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[19U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[20U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[21U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[22U * APP_ADC1_CHANNELS + rank]
    + (uint32_t)adc1_dma[23U * APP_ADC1_CHANNELS + rank];
  return (uint16_t)((sum + (APP_SAMPLES_PER_PERIOD / 2U)) / APP_SAMPLES_PER_PERIOD);
}

/* 24-point arithmetic mean across one channel of the ADC2 buffer.
 * Used for DC-like signals (ISEC, IPRI_DC); equivalent to 24x
 * oversampling -> SNR up by ~sqrt(24) ~ 4.9x. The pulsed nature of
 * ISEC is fine because the mean over a full switching period is
 * exactly the DC component delivered to the load. Hand-unrolled sum. */
static uint16_t arithmetic_mean24_adc2(uint8_t rank)
{
  uint32_t sum =
      (uint32_t)adc2_dma[ 0U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 1U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 2U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 3U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 4U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 5U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 6U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 7U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 8U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[ 9U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[10U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[11U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[12U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[13U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[14U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[15U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[16U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[17U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[18U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[19U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[20U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[21U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[22U * APP_ADC2_CHANNELS + rank]
    + (uint32_t)adc2_dma[23U * APP_ADC2_CHANNELS + rank];
  return (uint16_t)((sum + (APP_SAMPLES_PER_PERIOD / 2U)) / APP_SAMPLES_PER_PERIOD);
}

/* Per-period peak (max) of one ADC2 channel. Used for IPRI_AC: after the
 * 1:200 CT + 7.5R change it is only a MOS-protection peak-current readout
 * (PSFB reactive current makes its mean/interpolated value meaningless for
 * control and power). Reports the current period's peak; no history kept. */
static uint16_t period_max_adc2(uint8_t rank)
{
  uint16_t m = 0U;
  uint8_t i;

  for (i = 0U; i < APP_SAMPLES_PER_PERIOD; i++)
  {
    uint16_t v = adc2_dma[i * APP_ADC2_CHANNELS + rank];
    if (v > m) m = v;
  }
  return m;
}

/* 8-period moving average of the IPRI_DC per-period mean. The ACS712 is a
 * Hall-effect sensor with limited bandwidth, so -- like the AUX rails -- its
 * per-period 24-point mean is smoothed across APP_IPRI_DC_AVG_CYCLES switching
 * periods. Loop-free: rolling sum (drop the slot we overwrite, add the new
 * mean -- no re-sum) and a >>APP_IPRI_DC_AVG_SHIFT mean (window is 2^N). Ring
 * and sum are static and written only here, so rsum always equals the ring
 * sum; the brief power-on ramp (ring fills from 0) matches the AUX rails. */
static uint16_t ipri_dc_period_avg(uint16_t period_mean)
{
  static uint16_t ring[APP_IPRI_DC_AVG_CYCLES];
  static uint32_t rsum;
  static uint8_t idx;

  rsum = rsum + (uint32_t)period_mean - (uint32_t)ring[idx];
  ring[idx] = period_mean;
  idx = (uint8_t)((idx + 1U) & APP_IPRI_DC_AVG_MASK);
  return (uint16_t)((rsum + (APP_IPRI_DC_AVG_CYCLES / 2U)) >> APP_IPRI_DC_AVG_SHIFT);
}

/* ===================== Heartbeat builder ===================== */

static uint16_t build_heartbeat(void)
{
  HVCCPS_ConfigSnapshot cfg_snapshot;
  uint64_t v_sec_mv_sum;
  uint64_t i_sec_ma_sum;
  uint64_t i_pri_dc_ma_sum;
  uint32_t measurement_count;
  uint32_t v_sec_mv_average;
  uint32_t i_sec_ma_average;
  uint32_t i_pri_dc_ma_average;
  uint32_t irq_state;
  uint16_t off = 0U;
  uint8_t status_flags;
  uint16_t run_remaining;
  uint16_t total_len;
  uint16_t k;

  ConfigManager_GetSnapshot(&cfg_snapshot);

  /* Keep interrupts masked only for the coherent snapshot/reset. The three
   * divisions below run with the control IRQ enabled, so their cost is spread
   * through normal main-loop idle time rather than extending the control ISR. */
  irq_state = __get_PRIMASK();
  __disable_irq();
  v_sec_mv_sum = heartbeat_v_sec_mv_sum;
  i_sec_ma_sum = heartbeat_i_sec_ma_sum;
  i_pri_dc_ma_sum = heartbeat_i_pri_dc_ma_sum;
  measurement_count = heartbeat_measurement_count;
  heartbeat_v_sec_mv_sum = 0U;
  heartbeat_i_sec_ma_sum = 0U;
  heartbeat_i_pri_dc_ma_sum = 0U;
  heartbeat_measurement_count = 0U;
  if (irq_state == 0U) __enable_irq();

  if (measurement_count != 0U)
  {
    v_sec_mv_average = (uint32_t)((v_sec_mv_sum + (measurement_count / 2U)) / measurement_count);
    i_sec_ma_average = (uint32_t)((i_sec_ma_sum + (measurement_count / 2U)) / measurement_count);
    i_pri_dc_ma_average = (uint32_t)((i_pri_dc_ma_sum + (measurement_count / 2U)) / measurement_count);
  }
  else
  {
    /* Startup/diagnostic fallback if no control ISR completed in the window. */
    v_sec_mv_average = g_v_sec_dc_mv;
    i_sec_ma_average = g_i_sec_dc_ma;
    i_pri_dc_ma_average = g_i_pri_dc_ma;
  }

  /* Total = header(1) + length(2) + payload + sum(1) + xor(1) */
  total_len = (uint16_t)(1U + 2U +
                         (10U * 4U) +     /* measurement uint32s */
                         4U +              /* duty (float) */
                         4U +              /* current_freq_hz (uint32) */
                         4U +              /* base_freq_hz (uint32) */
                         4U +              /* freq_policy (uint32) */
                         (3U * 4U) +       /* CV/CC/CP targets */
                         (6U * 4U) +       /* CV/CC/CP value+integral floats */
                         (4U * 4U) +       /* config draft/active/flash/flags */
                         1U + 1U + 2U +    /* status, key, run_remaining */
                         (3U * 4U) +       /* ISR cycles last/min/max */
                         (APP_SAMPLES_PER_PERIOD * 2U * 2U) +  /* VSEC + VPRI uint16 */
                         (APP_SAMPLES_PER_PERIOD * 3U) +       /* ISEC + IPRI_AC + IPRI_DC uint8 */
                         (2U * 4U) +                           /* raw VSEC mV + raw ISEC mA */
                         2U);

  uart_tx_frame[off++] = APP_HEARTBEAT_HEADER;
  write_le16(&uart_tx_frame[off], total_len); off = (uint16_t)(off + 2U);
  write_le32(&uart_tx_frame[off], g_i_pri_ac_ma); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], i_sec_ma_average); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], i_pri_dc_ma_average); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], g_v_pri_dc_mv); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], v_sec_mv_average); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], g_aux_12v_mv); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], g_aux_5v_mv); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], g_vcc_mv); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], g_mos_temp_mc); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], g_internal_temp_mc); off = (uint16_t)(off + 4U);
  write_float(&uart_tx_frame[off], app.duty); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], g_derived.actual_freq_hz); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], cfg_snapshot.active.base_freq_hz); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], cfg_snapshot.active.freq_policy); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], app.cv_target_mv); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], app.cc_target_ma); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], app.cp_target_mw); off = (uint16_t)(off + 4U);
  write_float(&uart_tx_frame[off], app.cv.value); off = (uint16_t)(off + 4U);
  write_float(&uart_tx_frame[off], app.cv.integral); off = (uint16_t)(off + 4U);
  write_float(&uart_tx_frame[off], app.cc.value); off = (uint16_t)(off + 4U);
  write_float(&uart_tx_frame[off], app.cc.integral); off = (uint16_t)(off + 4U);
  write_float(&uart_tx_frame[off], app.cp.value); off = (uint16_t)(off + 4U);
  write_float(&uart_tx_frame[off], app.cp.integral); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], cfg_snapshot.draft_revision); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], cfg_snapshot.active_revision); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], cfg_snapshot.flash_sequence); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], cfg_snapshot.flags); off = (uint16_t)(off + 4U);

  status_flags = app.power_enable_latched;
  status_flags |= (uint8_t)(((uint8_t)app.mode & 0x03U) << 1);
  if (app.config_ok != 0U) status_flags |= APP_STATUS_BIT_CONFIG_OK;
  if ((app.fixed_duty_active != 0U) && (app.power_enable_latched != 0U)) status_flags |= APP_STATUS_BIT_FIXED_DUTY;
  if (app.ocp_latched != 0U) status_flags |= APP_STATUS_BIT_OCP;
  if (app.otp_latched != 0U) status_flags |= APP_STATUS_BIT_OTP;
  if (wdg_reset_latched != 0U) status_flags |= APP_STATUS_BIT_WDG_RESET;
  uart_tx_frame[off++] = status_flags;
  uart_tx_frame[off++] = read_key_flags();

  run_remaining = (app.power_enable_latched != 0U) ? app.run_seconds_remaining : 0U;
  write_le16(&uart_tx_frame[off], run_remaining); off = (uint16_t)(off + 2U);

  /* ISR-time stats: snapshot then reset min/max so the next heartbeat
   * window starts fresh. Short critical section keeps the ISR off the
   * shared variables while we copy and reset. */
  {
    uint32_t isr_last;
    uint32_t isr_min;
    uint32_t isr_max;
    __disable_irq();
    isr_last = isr_cycles_last;
    isr_min = isr_cycles_min;
    isr_max = isr_cycles_max;
    isr_cycles_min = 0xFFFFFFFFU;
    isr_cycles_max = 0U;
    __enable_irq();
    if (isr_min == 0xFFFFFFFFU) isr_min = 0U;  /* no ISR fired this window */
    write_le32(&uart_tx_frame[off], isr_last); off = (uint16_t)(off + 4U);
    write_le32(&uart_tx_frame[off], isr_min);  off = (uint16_t)(off + 4U);
    write_le32(&uart_tx_frame[off], isr_max);  off = (uint16_t)(off + 4U);
  }

  /* Waveforms: 24 samples per signal, one period of the switching cycle.
   * Read directly from the circular DMA buffers; the spec allows mixing
   * one or two samples from the previous period during the transition. */
  for (k = 0U; k < APP_SAMPLES_PER_PERIOD; k++)
  {
    write_le16(&uart_tx_frame[off], adc1_dma[k * APP_ADC1_CHANNELS + APP_ADC1_RANK_VSEC]);
    off = (uint16_t)(off + 2U);
  }
  for (k = 0U; k < APP_SAMPLES_PER_PERIOD; k++)
  {
    write_le16(&uart_tx_frame[off], adc1_dma[k * APP_ADC1_CHANNELS + APP_ADC1_RANK_VPRI]);
    off = (uint16_t)(off + 2U);
  }
  for (k = 0U; k < APP_SAMPLES_PER_PERIOD; k++)
  {
    uart_tx_frame[off++] = (uint8_t)adc2_dma[k * APP_ADC2_CHANNELS + APP_ADC2_RANK_ISEC];
  }
  for (k = 0U; k < APP_SAMPLES_PER_PERIOD; k++)
  {
    uart_tx_frame[off++] = (uint8_t)adc2_dma[k * APP_ADC2_CHANNELS + APP_ADC2_RANK_IPRI_AC];
  }
  for (k = 0U; k < APP_SAMPLES_PER_PERIOD; k++)
  {
    uart_tx_frame[off++] = (uint8_t)adc2_dma[k * APP_ADC2_CHANNELS + APP_ADC2_RANK_IPRI_DC];
  }

  /* Pre-calibration secondary readings, appended last so the host can show
   * raw-vs-calibrated without disturbing any existing field offsets. */
  write_le32(&uart_tx_frame[off], g_v_sec_dc_mv_raw); off = (uint16_t)(off + 4U);
  write_le32(&uart_tx_frame[off], g_i_sec_dc_ma_raw); off = (uint16_t)(off + 4U);

  if (off != (uint16_t)(total_len - 2U)) Error_Handler();
  uart_tx_frame[off++] = sum8(uart_tx_frame, (uint16_t)(total_len - 2U));
  uart_tx_frame[off++] = xor8(uart_tx_frame, (uint16_t)(total_len - 1U));
  if (off != total_len) Error_Handler();

  return total_len;
}

static void send_heartbeat_if_due(void)
{
  uint32_t now = HAL_GetTick();
  uint16_t len;

  send_pending_config_response();
  send_pending_cal_response();
  if ((now - heartbeat_last_tick) < APP_HEARTBEAT_INTERVAL_MS) return;
  heartbeat_last_tick = now;

  if (uart_tx_busy != 0U) return;

  len = build_heartbeat();
  uart_tx_busy = 1U;
  if (HAL_UART_Transmit_DMA(&huart3, uart_tx_frame, len) != HAL_OK)
  {
    uart_tx_busy = 0U;
    return;
  }

  HAL_GPIO_TogglePin(LED_C_GPIO_Port, LED_C_Pin);
}

/* ===================== Init ===================== */

void APP_Init(void)
{
  memset(&app, 0, sizeof(app));
  uart_rx_restart_pending = 0U;
  ConfigManager_Init();
  /* Validate the calibration table once at boot (CRC + dimensions). If absent
   * or invalid the lookups fall back to the raw conversion. */
  Calibration_Init();

  /* Reset-cause: remember an IWDG-induced reset so the heartbeat can warn the
   * host that the firmware likely ran away. Read before clearing; clear so a
   * later clean boot reports nothing. Refresh once now -- MX_IWDG_Init() already
   * started the watchdog and the rest of APP_Init runs well within its window. */
  wdg_reset_latched = (__HAL_RCC_GET_FLAG(RCC_FLAG_IWDGRST) != RESET) ? 1U : 0U;
  __HAL_RCC_CLEAR_RESET_FLAGS();
  HAL_IWDG_Refresh(&hiwdg);

  /* Enable DWT cycle counter for ISR-time telemetry. */
  CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
  DWT->CYCCNT = 0U;
  DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
  isr_cycles_last = 0U;
  isr_cycles_min = 0xFFFFFFFFU;
  isr_cycles_max = 0U;

  HAL_GPIO_WritePin(LED_A_GPIO_Port, LED_A_Pin, GPIO_PIN_SET);
  HAL_GPIO_WritePin(LED_B_GPIO_Port, LED_B_Pin, GPIO_PIN_SET);
  HAL_GPIO_WritePin(LED_C_GPIO_Port, LED_C_Pin, GPIO_PIN_SET);

  calibrate_adc(&hadc1);
  calibrate_adc(&hadc2);
  calibrate_adc(&hadc3);
  calibrate_adc(&hadc4);
  calibrate_adc(&hadc5);

  /* Cache the per-chip factory ADC calibration so the control ISR's VREF /
   * temperature math never re-reads system memory (see decls above). */
  vrefint_cal_x3000 = (uint32_t)(*VREFINT_CAL_ADDR) * VREFINT_CAL_VREF;
  ts_cal1 = (int32_t)(*TEMPSENSOR_CAL1_ADDR);
  ts_span = (int32_t)(*TEMPSENSOR_CAL2_ADDR) - ts_cal1;
  ts_cal_valid = (ts_span != 0) ? 1U : 0U;

  /* Hardware overcurrent protection: start the comparator and its DAC1 trip
   * reference (APP_OCP_TRIP_MV ~ 60 A). The HRTIM FLT4
   * path (configured in MX_HRTIM1_Init) then forces TA/TB off asynchronously
   * when the CT peak crosses the threshold -- armed before any output runs. */
  if (HAL_DAC_Start(&hdac1, DAC_CHANNEL_1) != HAL_OK) Error_Handler();
  apply_ocp_threshold();
  if (HAL_COMP_Start(&hcomp1) != HAL_OK) Error_Handler();

  set_psfb_outputs(0U);

  /* Preload all period/compare registers for the default switching frequency,
   * overriding the MX_HRTIM1_Init power-on defaults through the shadow regs. */
  apply_active_config();
  /* Counters are still stopped here; force the default reloads into the active
   * registers so the very first MASTER_CMP1 trigger is already at 35 kHz. */
  if (HAL_HRTIM_SoftwareUpdate(&hhrtim1, APP_TIMER_UPDATES_ALL) != HAL_OK) Error_Handler();

  /* Arm every ADC DMA BEFORE the HRTIM starts so the first MASTER_CMP1 trigger
   * lands on circular-buffer index 0 for every chain (TIM C/D/E are all reset
   * by MASTER_CMP1, so they re-align together). Per-period sample counts are
   * frequency-independent, so this alignment then holds across later frequency
   * changes without re-arming. */
  start_adc_dma(&hadc1, adc1_dma, APP_ADC1_BUFFER_LEN);
  start_adc_dma(&hadc2, adc2_dma, APP_ADC2_BUFFER_LEN);
  start_adc_dma(&hadc3, adc3_dma, APP_ADC3_BUFFER_LEN);
  start_adc_dma(&hadc4, adc4_dma, APP_ADC4_BUFFER_LEN);
  start_adc_dma(&hadc5, adc5_dma, APP_ADC5_BUFFER_LEN);
  if (HAL_HRTIM_WaveformCountStart_IT(&hhrtim1, APP_TIMERS_ALL) != HAL_OK) Error_Handler();

  app.config_ok = 1U;

  /* Start the 10 ms watchdog tick. Its callback refreshes the IWDG only while
   * both the main loop and the control ISR keep tagging wdg_activity. */
  if (HAL_TIM_Base_Start_IT(&htim6) != HAL_OK) Error_Handler();
  if (HAL_TIM_Base_Start_IT(&htim7) != HAL_OK) Error_Handler();

  start_uart_rx();
}

void APP_Task(void)
{
  wdg_activity |= APP_WDG_FLAG_LOOP;   /* watchdog liveness: main loop is running */
  if (uart_rx_restart_pending != 0U) restart_uart_rx();
  process_rx();
  process_keys();
  update_run_timer();
  send_heartbeat_if_due();
}

/* DWT-based ISR-duration stats. Called from HRTIM1_Master_IRQHandler right
 * after HAL_HRTIM_IRQHandler() returns, with start_cycles captured at IRQ
 * entry -- so the measured window now spans the whole interrupt (HAL flag
 * dispatch + callback + control body), not just APP_HRTIM_ControlISR().
 * CYCCNT wraps cleanly under 32-bit subtraction. */
void APP_HRTIM_IsrTimingEnd(uint32_t start_cycles)
{
  uint32_t elapsed = DWT->CYCCNT - start_cycles;
  isr_cycles_last = elapsed;
  if (elapsed < isr_cycles_min) isr_cycles_min = elapsed;
  if (elapsed > isr_cycles_max) isr_cycles_max = elapsed;
}

void APP_TIM7_FrequencyControlISR(void)
{
  freq_ctrl_score_and_plan();
}

/* ===================== Control ISR =====================
 * Runs on the MASTER repetition event, i.e. at every switching-period
 * boundary. At entry the period that just finished has all 24 fast samples
 * (and the 16 slow ones) sitting in the circular DMA buffers, so every
 * physical value is a clean full-period aggregate (24-point arithmetic means,
 * the anti-phase VSEC mean, the IPRI_AC peak). A new duty written here latches
 * at the next repetition via preload.
 */
void APP_HRTIM_ControlISR(void)
{
  const HVCCPS_Config *cfg = ConfigManager_Active();
  uint32_t v_pri_mv;
  uint32_t v_sec_mv;
  uint32_t i_sec_ma;
  uint32_t i_pri_dc_ma;
  uint32_t current_feedback_ma;
  uint32_t power_feedback_mw;
  float cv_error;
  float cc_error;
  float cp_error;
  float cv_candidate;
  float cc_candidate;
  float cp_candidate;
  float cv_frozen;
  float cc_frozen;
  float cp_frozen;
  float cv_next_i;
  float cc_next_i;
  float cp_next_i;
  APP_ControlMode winner;
  float duty;
  float duty_cap;
  uint8_t soft_limited;
  uint32_t ipri_dc_sensor_mv;
  uint32_t ipri_dc_zero_mv;
  uint16_t v_sec_raw;
  uint16_t v_pri_raw;
  uint16_t i_pri_dc_raw, i_sec_raw;

  wdg_activity |= APP_WDG_FLAG_ISR;   /* watchdog liveness: control ISR is running */

  /* LED heartbeat: toggle every 5000th ISR. Compare-and-reset instead of
   * `% 5000U`, which compiles to a hardware UDIV on every ISR. hrtim_irq_count
   * feeds nothing else, so reusing/resetting it as the divider is fine. */
  if (++hrtim_irq_count >= 5000U)
  {
    hrtim_irq_count = 0U;
    HAL_GPIO_TogglePin(LED_A_GPIO_Port, LED_A_Pin);
  }

  /* Refresh slow auxiliary signals first: g_vcc_mv (used by every
   * adcXX_to_mv below) must be current before the main-signal conversions
   * run. (IPRI_DC zero point is now a fixed 2.5 V, no longer g_aux_5v_mv/2;
   * g_aux_5v_mv itself is still refreshed here for telemetry.) This runs
   * every control ISR so the 16-period ring contains consecutive periods. */
  process_slow_adc_isr();

  /* IPRI_AC: rectified CT per-period PEAK, MOS over-current protection
   * telemetry only -- never fed into the control loop. */
  g_i_pri_ac_ma = (adc8_to_mv(period_max_adc2(APP_ADC2_RANK_IPRI_AC)) * 400UL) / 15UL;

  /* VSEC: 12-pair anti-phase mean across the full period (PSFB EMI
   * cancels in 180-deg pairs, clamp-aware so saturated samples don't
   * poison the average). */
  v_sec_raw = anti_phase_pairwise_mean_vsec();

  /* VPRI, ISEC, IPRI_DC: DC-like signals -> full-period 24-point arithmetic
   * mean. VPRI is the hardware-filtered DC bus, so averaging the whole period
   * (like ISEC/IPRI_DC) is simpler and higher-SNR than the former two-point
   * phase interpolation, and makes the phase-shift fraction unnecessary.
   * IPRI_DC feeds an extra 8-period moving average (slow ACS712 Hall sensor). */
  v_pri_raw    = arithmetic_mean24_adc1(APP_ADC1_RANK_VPRI);
  i_sec_raw    = arithmetic_mean24_adc2(APP_ADC2_RANK_ISEC);
  i_pri_dc_raw = ipri_dc_period_avg(arithmetic_mean24_adc2(APP_ADC2_RANK_IPRI_DC));

  v_sec_mv = adc12_to_mv(v_sec_raw) * 1000U;          /* 1:1000 divider */
  v_pri_mv = adc12_to_mv(v_pri_raw) * 17U;            /* 16k+1k divider */
  i_sec_ma = (adc8_to_mv(i_sec_raw) * 1626UL) / 10000UL;  /* 162.6 mA/V */

  /* Output calibration: correct the secondary feedback BEFORE the control loop
   * so the setpoint maps to the true output. Current is corrected first, then
   * voltage using the corrected current (the V sense is load-dependent), per
   * I_cal = I_raw + dI(I_raw); V_cal = V_raw + dV(V_raw, I_cal). The lookups
   * clamp each correction (+/-50 V, +/-50 mA) and return the input unchanged
   * when no valid table is enabled, so safety can never swing far from the bare
   * ADC reading. Raw values are kept for telemetry. */
  g_v_sec_dc_mv_raw = v_sec_mv;
  g_i_sec_dc_ma_raw = i_sec_ma;
  if ((cfg->cal_enable != 0U) && (Calibration_IsValid() != 0U))
  {
    i_sec_ma = Calibration_ApplyCurrent(i_sec_ma);
    v_sec_mv = Calibration_ApplyVoltage(v_sec_mv, i_sec_ma);
  }

  /* IPRI_DC: ACS712 reverse-series, precise 2.5 V zero point, 100 mV/A.
   * (Measured: output at 0 A is a fixed 2.5 V, not the ratiometric AUX_5V/2.) */
  ipri_dc_sensor_mv = adc8_to_mv(i_pri_dc_raw);
  ipri_dc_zero_mv = APP_IPRI_DC_ZERO_MV;
  if (ipri_dc_sensor_mv < ipri_dc_zero_mv)
  {
    i_pri_dc_ma = (ipri_dc_zero_mv - ipri_dc_sensor_mv) * 10U;
  }
  else
  {
    i_pri_dc_ma = 0U;
  }

  g_v_pri_dc_mv = v_pri_mv;
  g_v_sec_dc_mv = v_sec_mv;
  g_i_sec_dc_ma = i_sec_ma;
  g_i_pri_dc_ma = i_pri_dc_ma;
  /* g_i_pri_ac_ma is updated once per ISR above. */

  /* Accumulate calibrated VSEC/ISEC and the existing 8-period-smoothed
   * IPRI_DC value. No division or heartbeat formatting runs in this ISR. */
  heartbeat_v_sec_mv_sum += (uint64_t)v_sec_mv;
  heartbeat_i_sec_ma_sum += (uint64_t)i_sec_ma;
  heartbeat_i_pri_dc_ma_sum += (uint64_t)i_pri_dc_ma;
  heartbeat_measurement_count++;

  /* Hardware overcurrent: COMP1 -> HRTIM FLT4 has already forced TA/TB to the
   * inactive (off) state. Latch it in software so the loop stays down until the
   * host re-enables, and let the disabled-output path below hold duty at 0.
   * The control ISR keeps running -- the fault disables outputs, not the master
   * timer that triggers this ISR. Recovery is host re-enable (clear_ocp_fault). */
  if (__HAL_HRTIM_GET_FLAG(&hhrtim1, HRTIM_FLAG_FLT4) != 0U)
  {
    app.ocp_latched = 1U;
    app.power_enable_latched = 0U;
    app.fixed_duty_active = 0U;
    app.mode = APP_MODE_DISABLED;
  }

  /* Over-temperature protection: MOS NTC or MCU internal sensor above the trip
   * limit forces the output off and latches like OCP (sticky until host
   * re-enable). g_mos_temp_mc / g_internal_temp_mc were just refreshed by
   * process_slow_adc_isr(). Unlike OCP there is no hardware fault path, so stop
   * the gate drive here on the trip edge; the disabled-output path below then
   * holds duty at 0. Boot is safe: both temps ramp up from 0 (NTC raw 0 -> 0 C,
   * internal-sensor errors/negatives -> 0), so the filtered values never
   * overshoot into a false trip. */
  if ((g_mos_temp_mc > APP_OTP_TRIP_MC) || (g_internal_temp_mc > APP_OTP_TRIP_MC))
  {
    if (app.otp_latched == 0U)
    {
      app.otp_latched = 1U;
      set_psfb_outputs(0U);
    }
    app.power_enable_latched = 0U;
    app.fixed_duty_active = 0U;
    app.mode = APP_MODE_DISABLED;
  }

  /* Internal supply UVLO/OVP: keep the protocol/software enable state as-is,
   * but hold the real gate outputs off after 30 bad switching periods. When
   * every rail is back in range for 10 periods, a still-latched software enable
   * automatically re-arms the outputs and soft-starts from zero duty. */
  if (supply_protection_update(v_pri_mv) != 0U)
  {
    set_duty(0.0f);
    set_psfb_gate_outputs(0U);
    set_software_enable_led(app.power_enable_latched);
    freq_ctrl_reset(0U);
    if (app.power_enable_latched != 0U) return;
  }

  if (app.power_enable_latched == 0U)
  {
    set_duty(0.0f);
    restore_base_frequency_when_output_off();
    return;
  }

  /* Soft-start ceiling for this ISR: last-applied duty + one step. Captured here,
   * before freq_ctrl_consume_pending() can bump app.duty to a feed-forward target,
   * so a post-frequency-change jump is rate-limited the same as any other rise. */
  duty_cap = app.duty + cfg->soft_start_step;

  if (app.fixed_duty_active != 0U)
  {
    float fixed_duty = app.fixed_duty_value;
    app.mode = APP_MODE_CV;
    /* Soft-start is mandatory even for the fixed-duty debug path: a 100% request
     * still climbs one step per ISR. (set_duty() clamps to [0,1].) */
    if (fixed_duty > duty_cap) fixed_duty = duty_cap;
    set_duty(fixed_duty);
    return;
  }

  /* CC feedback: secondary DC current only. IPRI_AC carries PSFB reactive
   * current and is no longer referred into the loop; the primary side is
   * left out entirely per the secondary-only control decision. */
  current_feedback_ma = i_sec_ma;

  /* CP feedback: real power. Primary input power uses the DC bus current
   * (IPRI_DC), not the reactive IPRI_AC. Take the larger of input/output. */
  power_feedback_mw = pi_power_mw(v_pri_mv, i_pri_dc_ma);
  {
    uint32_t p_sec_mw = pi_power_mw(v_sec_mv, i_sec_ma);
    if (p_sec_mw > power_feedback_mw) power_feedback_mw = p_sec_mw;
  }

  cv_error = (float)((int32_t)app.cv_target_mv - (int32_t)v_sec_mv);
  cc_error = (float)((int32_t)app.cc_target_ma - (int32_t)current_feedback_ma);
  cp_error = (float)((int32_t)app.cp_target_mw - (int32_t)power_feedback_mw);

  freq_ctrl_consume_pending(cv_error, cc_error, cp_error);

  cv_frozen = pi_frozen_value(&app.cv, cv_error, cfg->kp_cv);
  cc_frozen = pi_frozen_value(&app.cc, cc_error, cfg->kp_cc);
  cp_frozen = pi_frozen_value(&app.cp, cp_error, cfg->kp_cp);
  cv_next_i = clamp_f(app.cv.integral + (cfg->ki_cv * cv_error), APP_PI_MIN, APP_PI_MAX);
  cc_next_i = clamp_f(app.cc.integral + (cfg->ki_cc * cc_error), APP_PI_MIN, APP_PI_MAX);
  cp_next_i = clamp_f(app.cp.integral + (cfg->ki_cp * cp_error), APP_PI_MIN, APP_PI_MAX);
  cv_candidate = (app.mode == APP_MODE_CV) ? clamp_f((cfg->kp_cv * cv_error) + cv_next_i, APP_PI_MIN, APP_PI_MAX) : cv_frozen;
  cc_candidate = (app.mode == APP_MODE_CC) ? clamp_f((cfg->kp_cc * cc_error) + cc_next_i, APP_PI_MIN, APP_PI_MAX) : cc_frozen;
  cp_candidate = (app.mode == APP_MODE_CP) ? clamp_f((cfg->kp_cp * cp_error) + cp_next_i, APP_PI_MIN, APP_PI_MAX) : cp_frozen;

  duty = cc_candidate;
  winner = APP_MODE_CC;
  if (cv_candidate < duty) { duty = cv_candidate; winner = APP_MODE_CV; }
  if (cp_candidate < duty) { duty = cp_candidate; winner = APP_MODE_CP; }

  /* Soft-start as the final min() term: duty = min(CV, CC, CP, duty_cap). When the
   * cap binds, the loops are not tracking the output, so freeze ALL integrals this
   * ISR -- otherwise they wind up during the ramp and overshoot on release. Only
   * rises are limited: a fall leaves duty < duty_cap, so soft_limited stays 0. */
  soft_limited = (duty > duty_cap) ? 1U : 0U;
  if (soft_limited != 0U) duty = duty_cap;

  pi_commit(&app.cv, cv_candidate, cv_next_i, (soft_limited == 0U) && (winner == APP_MODE_CV));
  pi_commit(&app.cc, cc_candidate, cc_next_i, (soft_limited == 0U) && (winner == APP_MODE_CC));
  pi_commit(&app.cp, cp_candidate, cp_next_i, (soft_limited == 0U) && (winner == APP_MODE_CP));
  app.mode = winner;
  set_duty(duty);
}

void HAL_HRTIM_RepetitionEventCallback(HRTIM_HandleTypeDef *hhrtim, uint32_t TimerIdx)
{
  if ((hhrtim->Instance == HRTIM1) && (TimerIdx == HRTIM_TIMERINDEX_MASTER))
  {
    APP_HRTIM_ControlISR();
  }
}

/* TIM6 10 ms tick: the watchdog liveness check. Sample-and-clear the activity
 * flag, advance the per-path miss counters, and refresh the IWDG only while
 * both the main loop and the control ISR have been alive within the last
 * APP_WDG_MISS_LIMIT ticks (100 ms). If either path goes silent that long the
 * refresh stops and the IWDG (~200 ms) resets the MCU. */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
  uint8_t activity;

  if (htim->Instance == TIM7)
  {
    APP_TIM7_FrequencyControlISR();
    return;
  }

  if (htim->Instance != TIM6) return;

  activity = wdg_activity;
  wdg_activity = 0U;

  if ((activity & APP_WDG_FLAG_LOOP) != 0U) wdg_loop_miss = 0U;
  else if (wdg_loop_miss < 0xFFU)           wdg_loop_miss++;

  if ((activity & APP_WDG_FLAG_ISR) != 0U)  wdg_isr_miss = 0U;
  else if (wdg_isr_miss < 0xFFU)            wdg_isr_miss++;

  if ((wdg_loop_miss < APP_WDG_MISS_LIMIT) && (wdg_isr_miss < APP_WDG_MISS_LIMIT))
  {
    HAL_IWDG_Refresh(&hiwdg);
  }
}

void HAL_UART_TxCpltCallback(UART_HandleTypeDef *huart)
{
  if (huart->Instance == USART3)
  {
    uart_tx_busy = 0U;
    send_pending_config_response();
    send_pending_cal_response();
  }
}

void HAL_UART_ErrorCallback(UART_HandleTypeDef *huart)
{
  if (huart->Instance == USART3)
  {
    uart_tx_busy = 0U;
    uart_rx_restart_pending = 1U;
  }
}

void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)
{
  if (huart->Instance == USART3)
  {
    if (Size > APP_UART_RX_DMA_LEN) Size = APP_UART_RX_DMA_LEN;
    push_rx_bytes(uart_rx_dma, Size);
    restart_uart_rx();
  }
}
