/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file    config_manager.h
  * @brief   Draft/active/persistent configuration ownership for HVCCPS.
  ******************************************************************************
  */
/* USER CODE END Header */

#ifndef __CONFIG_MANAGER_H__
#define __CONFIG_MANAGER_H__

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

#define HV_CONFIG_SCHEMA_VERSION       3UL

#define HV_CONFIG_VALUE_U32            1U
#define HV_CONFIG_VALUE_FLOAT          2U

#define HV_CONFIG_TARGET_DRAFT         0U
#define HV_CONFIG_TARGET_ACTIVE        1U

#define HV_CONFIG_FLAG_FLASH_VALID     0x00000001UL
#define HV_CONFIG_FLAG_DRAFT_DIRTY     0x00000002UL
#define HV_CONFIG_FLAG_ACTIVE_DIRTY    0x00000004UL
#define HV_CONFIG_FLAG_FLASH_FULL      0x00000008UL

#define HV_CONFIG_STATUS_OK            0U
#define HV_CONFIG_STATUS_BAD_FIELD     1U
#define HV_CONFIG_STATUS_BAD_TYPE      2U
#define HV_CONFIG_STATUS_BAD_VALUE     3U
#define HV_CONFIG_STATUS_FLASH_ERROR   4U
#define HV_CONFIG_STATUS_NO_FLASH      5U
#define HV_CONFIG_STATUS_LOCKED        6U
#define HV_CONFIG_STATUS_BAD_REQUEST   7U
#define HV_CONFIG_STATUS_BUSY          8U

typedef enum
{
  HV_FREQ_POLICY_FIXED = 0,
  HV_FREQ_POLICY_AUTO = 1
} HV_FreqPolicy;

typedef enum
{
  HV_CONFIG_FIELD_KP_CV = 1,
  HV_CONFIG_FIELD_KI_CV = 2,
  HV_CONFIG_FIELD_KP_CC = 3,
  HV_CONFIG_FIELD_KI_CC = 4,
  HV_CONFIG_FIELD_KP_CP = 5,
  HV_CONFIG_FIELD_KI_CP = 6,
  HV_CONFIG_FIELD_BASE_FREQ_HZ = 7,
  HV_CONFIG_FIELD_FREQ_POLICY = 8,
  HV_CONFIG_FIELD_SOFT_START_STEP = 9,
  HV_CONFIG_FIELD_FREQ_SCORE_LIMIT = 20,
  HV_CONFIG_FIELD_FREQ_ENABLE_LOCKOUT_TICKS = 21,
  HV_CONFIG_FIELD_FREQ_RELOAD_LOCKOUT_TICKS = 22,
  HV_CONFIG_FIELD_FREQ_TARGET_LOCKOUT_TICKS = 23,
  HV_CONFIG_FIELD_FREQ_DUTY_FILTER_ALPHA = 24,
  HV_CONFIG_FIELD_FREQ_MIN_STEP_HZ = 25,
  HV_CONFIG_FIELD_FREQ_MAX_STEP_HZ = 26,
  HV_CONFIG_FIELD_FREQ_DOWN_TRIGGER_PCT = 27,
  HV_CONFIG_FIELD_FREQ_DOWN_FAST_PCT = 28,
  HV_CONFIG_FIELD_FREQ_DOWN_SAT_PCT = 29,
  HV_CONFIG_FIELD_FREQ_DOWN_STOP_PCT = 30,
  HV_CONFIG_FIELD_FREQ_UP_TRIGGER_OFFSET_PCT = 31,
  HV_CONFIG_FIELD_FREQ_UP_STOP_SLOPE = 32,
  HV_CONFIG_FIELD_FREQ_UP_STOP_OFFSET_PCT = 33,
  HV_CONFIG_FIELD_FREQ_UP_PRED_LIMIT_PCT = 34,
  HV_CONFIG_FIELD_FREQ_FF_GAMMA = 35,
  /* Per-key run presets (closed-loop CC/CV/CP + run time). Units match the
   * run command path: CV in mV, CC in mA, CP in mW, time in s (0 = continuous),
   * enable in {0,1}. Read on a front-panel key press (see APP process_keys). */
  HV_CONFIG_FIELD_BTN_A_ENABLE = 40,
  HV_CONFIG_FIELD_BTN_A_CC_MA = 41,
  HV_CONFIG_FIELD_BTN_A_CV_MV = 42,
  HV_CONFIG_FIELD_BTN_A_CP_MW = 43,
  HV_CONFIG_FIELD_BTN_A_TIME_S = 44,
  HV_CONFIG_FIELD_BTN_B_ENABLE = 45,
  HV_CONFIG_FIELD_BTN_B_CC_MA = 46,
  HV_CONFIG_FIELD_BTN_B_CV_MV = 47,
  HV_CONFIG_FIELD_BTN_B_CP_MW = 48,
  HV_CONFIG_FIELD_BTN_B_TIME_S = 49,
  /* Output calibration master switch. When 1 (and a valid calibration table is
   * present in flash) the control ISR applies the V/I correction tables; when 0
   * the supply runs on the bare ADC conversion. Stored in config metadata so it
   * persists and gates calibration independently of the table contents. */
  HV_CONFIG_FIELD_CAL_ENABLE = 50
} HV_ConfigFieldId;

typedef struct
{
  float kp_cv;
  float ki_cv;
  float kp_cc;
  float ki_cc;
  float kp_cp;
  float ki_cp;
  uint32_t base_freq_hz;
  uint32_t freq_policy;
  float soft_start_step;
  float freq_score_limit;
  uint32_t freq_enable_lockout_ticks;
  uint32_t freq_reload_lockout_ticks;
  uint32_t freq_target_lockout_ticks;
  float freq_duty_filter_alpha;
  uint32_t freq_min_step_hz;
  uint32_t freq_max_step_hz;
  float freq_down_trigger_pct;
  float freq_down_fast_pct;
  float freq_down_sat_pct;
  float freq_down_stop_pct;
  float freq_up_trigger_offset_pct;
  float freq_up_stop_slope;
  float freq_up_stop_offset_pct;
  float freq_up_pred_limit_pct;
  float freq_ff_gamma;
  /* Per-key run presets. btn_*_enable arms the preset; the rest are the
   * closed-loop targets (CV mV, CC mA, CP mW) and run time (s, 0 = continuous).
   * Appended last so the existing field wire order is unchanged. */
  uint32_t btn_a_enable;
  uint32_t btn_a_cc_ma;
  uint32_t btn_a_cv_mv;
  uint32_t btn_a_cp_mw;
  uint32_t btn_a_time_s;
  uint32_t btn_b_enable;
  uint32_t btn_b_cc_ma;
  uint32_t btn_b_cv_mv;
  uint32_t btn_b_cp_mw;
  uint32_t btn_b_time_s;
  /* Output calibration enable (0/1). Appended last so the existing field wire
   * order is unchanged; the schema-version bump invalidates older records. */
  uint32_t cal_enable;
} HVCCPS_Config;

typedef struct
{
  uint32_t schema_version;
  uint32_t draft_revision;
  uint32_t active_revision;
  uint32_t flash_sequence;
  uint32_t flags;
  HVCCPS_Config draft;
  HVCCPS_Config active;
} HVCCPS_ConfigSnapshot;

void ConfigManager_Init(void);
const HVCCPS_Config *ConfigManager_Draft(void);
const HVCCPS_Config *ConfigManager_Active(void);
void ConfigManager_GetSnapshot(HVCCPS_ConfigSnapshot *snapshot);

uint8_t ConfigManager_SetDraftField(uint16_t field_id, uint8_t value_type,
                                    uint32_t value_u32, float value_f);
uint8_t ConfigManager_ResetDraftField(uint16_t field_id);
uint8_t ConfigManager_GetField(const HVCCPS_Config *config, uint16_t field_id,
                               uint8_t *value_type, uint32_t *value_u32,
                               float *value_f);

void ConfigManager_LoadDefaultsToDraft(void);
uint8_t ConfigManager_LoadFlashToDraft(void);
uint8_t ConfigManager_ApplyDraft(void);
uint8_t ConfigManager_SaveDraftToFlash(void);
uint8_t ConfigManager_FactoryResetFlashAndDraft(void);

#ifdef __cplusplus
}
#endif

#endif /* __CONFIG_MANAGER_H__ */
