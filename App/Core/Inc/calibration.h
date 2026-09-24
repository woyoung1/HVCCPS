/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file    calibration.h
  * @brief   Output V/I calibration tables: flash store, validation, lookup.
  *
  *          The host pre-compiles a dense residual grid (delta = measured -
  *          raw) and streams it into a dedicated flash region that sits just
  *          below the config-log page and survives App updates. The control
  *          ISR applies the correction to the secondary feedback:
  *
  *            I_cal = I_raw + dI(I_raw)                  (1D linear)
  *            V_cal = V_raw + dV(V_raw, I_cal)           (2D bilinear)
  *
  *          Corrections are clamped (+/-50 V, +/-50 mA) so a bad table can
  *          never pull a reading far from the bare ADC conversion.
  ******************************************************************************
  */
/* USER CODE END Header */

#ifndef __CALIBRATION_H__
#define __CALIBRATION_H__

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

/* ---- Flash region (5 pages, 10 KB, pages 58..62, below the config page) ----
 * The App scatter is shrunk to 0x19000 so the linker can never place code or
 * RO data here, and the bootloader only erases the pages a new App image
 * actually spans (~30 for a 60 KB App), so this region persists across
 * firmware updates. */
#define HV_CAL_FLASH_PAGE_ADDR     0x0801D000UL
#define HV_CAL_FLASH_FIRST_PAGE    58UL
#define HV_CAL_FLASH_PAGE_COUNT    5UL
#define HV_CAL_FLASH_BYTES         0x2800UL   /* 10240 */

/* ---- Grid geometry (must match the host compiler) ----
 * Voltage axis: 0..2200 V in 10 V steps  -> 221 points.
 * Current axis: 0..200 mA in 10 mA steps -> 21 points. */
#define HV_CAL_V_POINTS            221U
#define HV_CAL_I_POINTS            21U
#define HV_CAL_V_STEP_MV           10000U     /* 10 V  */
#define HV_CAL_I_STEP_MA           10U        /* 10 mA */
#define HV_CAL_V_MAX_MV            2200000U
#define HV_CAL_I_MAX_MA            200U

/* ---- Max correction magnitude (safety clamp, applied in firmware) ---- */
#define HV_CAL_MAX_DV_MV           50000      /* +/-50 V (per spec) */
#define HV_CAL_MAX_DI_MA           50         /* +/-50 mA           */

/* ---- Image layout ----
 * Stored as int16, little-endian. dV in 0.1 V units, dI in 0.1 mA units.
 *   [0..63]    header (64 B)
 *   [64..]     dI[HV_CAL_I_POINTS]                 (row)
 *   [..]       dV[HV_CAL_V_POINTS * HV_CAL_I_POINTS] row-major as dV[v*ni + i]
 * data_crc is a CRC32 (zlib, poly 0xEDB88320) over image bytes [8 .. end). */
#define HV_CAL_HEADER_BYTES        64U
#define HV_CAL_DI_BYTES            (HV_CAL_I_POINTS * 2U)                      /* 42   */
#define HV_CAL_DV_BYTES            (HV_CAL_V_POINTS * HV_CAL_I_POINTS * 2U)   /* 9282 */
#define HV_CAL_DATA_BYTES          (HV_CAL_DI_BYTES + HV_CAL_DV_BYTES)        /* 9324 */
#define HV_CAL_IMAGE_BYTES         (HV_CAL_HEADER_BYTES + HV_CAL_DATA_BYTES)  /* 9388 */
#define HV_CAL_DI_OFFSET           HV_CAL_HEADER_BYTES
#define HV_CAL_DV_OFFSET           (HV_CAL_HEADER_BYTES + HV_CAL_DI_BYTES)

#define HV_CAL_MAGIC               0x4856434CUL   /* "HVCL" */
#define HV_CAL_VERSION             1UL
#define HV_CAL_CRC_COVER_START     8U             /* CRC32 over [8 .. image end) */

/* Staging-commit / write status codes (mirror the config status space so the
 * host can reuse its decoder). */
#define HV_CAL_STATUS_OK           0U
#define HV_CAL_STATUS_BAD_LEN      1U
#define HV_CAL_STATUS_BAD_DIMS     2U
#define HV_CAL_STATUS_BAD_CRC      3U
#define HV_CAL_STATUS_FLASH_ERROR  4U
#define HV_CAL_STATUS_LOCKED       6U
#define HV_CAL_STATUS_BAD_REQUEST  7U

typedef struct
{
  uint8_t  valid;          /* a valid table is present in flash               */
  uint32_t version;        /* record version found in flash (0 if invalid)    */
  uint32_t data_crc;       /* CRC32 of the stored table (0 if invalid)        */
  uint16_t v_points;       /* grid dimensions actually stored                 */
  uint16_t i_points;
} HV_CalInfo;

void Calibration_Init(void);
uint8_t Calibration_IsValid(void);
void Calibration_GetInfo(HV_CalInfo *info);

/* Control-ISR lookups. With no valid table these return the raw input
 * unchanged, so an uncalibrated board behaves exactly as before. */
uint32_t Calibration_ApplyCurrent(uint32_t i_raw_ma);
uint32_t Calibration_ApplyVoltage(uint32_t v_raw_mv, uint32_t i_cal_ma);

/* Chunked upload: BEGIN clears the RAM stage, DATA fills it, COMMIT validates
 * and burns it to flash (caller must guarantee the output is off). */
uint8_t Calibration_StageBegin(uint32_t total_len, uint32_t expected_crc);
uint8_t Calibration_StageData(uint32_t offset, const uint8_t *data, uint32_t len);
uint8_t Calibration_StageCommit(void);

#ifdef __cplusplus
}
#endif

#endif /* __CALIBRATION_H__ */
