/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file    config_manager.c
  * @brief   Draft/active/persistent configuration manager.
  ******************************************************************************
  */
/* USER CODE END Header */

#include "config_manager.h"

#include "main.h"
#include "stm32g4xx_hal_flash.h"
#include "stm32g4xx_hal_flash_ex.h"
#include <math.h>
#include <stddef.h>
#include <string.h>

#define HV_CONFIG_MAGIC                0x48564346UL  /* "HVCF" */
#define HV_CONFIG_RECORD_VERSION       1UL
#define HV_CONFIG_FLASH_PAGE_ADDR      0x0801F800UL
#define HV_CONFIG_FLASH_PAGE_INDEX     63UL
#define HV_CONFIG_FLASH_PAGE_BYTES     0x800UL
#define HV_CONFIG_RECORD_DATA_BYTES    ((uint32_t)sizeof(HVCCPS_Config))
#define HV_CONFIG_RECORD_HEADER_WORDS  7UL
#define HV_CONFIG_RECORD_BYTES         ((HV_CONFIG_RECORD_HEADER_WORDS * 4UL) + HV_CONFIG_RECORD_DATA_BYTES)

#define HV_CONFIG_FREQ_MIN_HZ          11000UL
#define HV_CONFIG_FREQ_MAX_HZ          45000UL
#define HV_CONFIG_FREQ_MIN_STEP_HZ     100UL
#define HV_CONFIG_FREQ_MAX_STEP_HZ     10000UL

/* Per-key preset limits, mirroring the run command clamps in app_core.c
 * (APP_MAX_CC_MA / APP_MAX_CV_MV / APP_MAX_CP_MW). Run time fits the u16 run
 * duration carried by the command frame; 0 means run continuously. */
#define HV_CONFIG_BTN_MAX_CC_MA        200UL
#define HV_CONFIG_BTN_MAX_CV_MV        2200000UL
#define HV_CONFIG_BTN_MAX_CP_MW        400000UL
#define HV_CONFIG_BTN_MAX_TIME_S       65534UL

typedef struct
{
  uint32_t magic;
  uint32_t record_version;
  uint32_t schema_version;
  uint32_t sequence;
  uint32_t length;
  uint32_t crc;
  uint32_t reserved;
  HVCCPS_Config config;
} HV_ConfigFlashRecord;

static HVCCPS_Config draft_config;
static HVCCPS_Config active_config;
static HVCCPS_Config flash_config;
static uint32_t draft_revision;
static uint32_t active_revision;
static uint32_t flash_sequence;
static uint32_t config_flags;
static uint8_t flash_config_valid;
static uint8_t flash_full_latched;

static void load_defaults(HVCCPS_Config *cfg)
{
  cfg->kp_cv = 0.0000040f;
  cfg->ki_cv = 0.0000008f;
  cfg->kp_cc = 0.0010000f;
  cfg->ki_cc = 0.0000800f;
  cfg->kp_cp = 0.0000010f;
  cfg->ki_cp = 0.0000001f;
  cfg->base_freq_hz = 35000U;
  cfg->freq_policy = HV_FREQ_POLICY_AUTO;
  cfg->soft_start_step = 0.10f;
  cfg->freq_score_limit = 100.0f;
  cfg->freq_enable_lockout_ticks = 20U;
  cfg->freq_reload_lockout_ticks = 10U;
  cfg->freq_target_lockout_ticks = 10U;
  cfg->freq_duty_filter_alpha = 0.25f;
  cfg->freq_min_step_hz = 1000U;
  cfg->freq_max_step_hz = 4000U;
  cfg->freq_down_trigger_pct = 95.0f;
  cfg->freq_down_fast_pct = 98.0f;
  cfg->freq_down_sat_pct = 99.5f;
  cfg->freq_down_stop_pct = 90.0f;
  cfg->freq_up_trigger_offset_pct = 25.0f;
  cfg->freq_up_stop_slope = 6.0f / 7.0f;
  cfg->freq_up_stop_offset_pct = 36.4285714f;
  cfg->freq_up_pred_limit_pct = 90.0f;
  cfg->freq_ff_gamma = 0.924f;
  /* Presets ship disabled with zero targets: an unconfigured key press is a
   * safe no-op until the operator defines and saves a preset from the host. */
  cfg->btn_a_enable = 0U;
  cfg->btn_a_cc_ma = 0U;
  cfg->btn_a_cv_mv = 0U;
  cfg->btn_a_cp_mw = 0U;
  cfg->btn_a_time_s = 0U;
  cfg->btn_b_enable = 0U;
  cfg->btn_b_cc_ma = 0U;
  cfg->btn_b_cv_mv = 0U;
  cfg->btn_b_cp_mw = 0U;
  cfg->btn_b_time_s = 0U;
  /* Calibration ships disabled: a fresh board uses the bare ADC conversion
   * until the operator uploads a table and enables it from the host. */
  cfg->cal_enable = 0U;
}

static uint32_t crc32_update(uint32_t crc, const uint8_t *data, uint32_t len)
{
  uint32_t i;
  uint8_t bit;

  crc = ~crc;
  for (i = 0U; i < len; i++)
  {
    crc ^= data[i];
    for (bit = 0U; bit < 8U; bit++)
    {
      if ((crc & 1UL) != 0UL) crc = (crc >> 1U) ^ 0xEDB88320UL;
      else crc >>= 1U;
    }
  }
  return ~crc;
}

static uint32_t config_crc(const HV_ConfigFlashRecord *record)
{
  uint32_t crc = 0UL;
  crc = crc32_update(crc, (const uint8_t *)&record->record_version, 4U);
  crc = crc32_update(crc, (const uint8_t *)&record->schema_version, 4U);
  crc = crc32_update(crc, (const uint8_t *)&record->sequence, 4U);
  crc = crc32_update(crc, (const uint8_t *)&record->length, 4U);
  crc = crc32_update(crc, (const uint8_t *)&record->config, HV_CONFIG_RECORD_DATA_BYTES);
  return crc;
}

static uint8_t finite_nonnegative(float value)
{
  return (isfinite(value) && (value >= 0.0f)) ? 1U : 0U;
}

static uint8_t in_range_f(float value, float lo, float hi)
{
  return (isfinite(value) && (value >= lo) && (value <= hi)) ? 1U : 0U;
}

static uint8_t validate_config(const HVCCPS_Config *cfg)
{
  if (!finite_nonnegative(cfg->kp_cv) || !finite_nonnegative(cfg->ki_cv) ||
      !finite_nonnegative(cfg->kp_cc) || !finite_nonnegative(cfg->ki_cc) ||
      !finite_nonnegative(cfg->kp_cp) || !finite_nonnegative(cfg->ki_cp))
  {
    return 0U;
  }

  if ((cfg->base_freq_hz < HV_CONFIG_FREQ_MIN_HZ) ||
      (cfg->base_freq_hz > HV_CONFIG_FREQ_MAX_HZ))
  {
    return 0U;
  }

  if ((cfg->freq_policy != HV_FREQ_POLICY_FIXED) &&
      (cfg->freq_policy != HV_FREQ_POLICY_AUTO))
  {
    return 0U;
  }

  if (!in_range_f(cfg->soft_start_step, 0.0f, 1.0f)) return 0U;
  if (!in_range_f(cfg->freq_score_limit, 1.0f, 10000.0f)) return 0U;
  if (cfg->freq_enable_lockout_ticks > 6000U) return 0U;
  if (cfg->freq_reload_lockout_ticks > 6000U) return 0U;
  if (cfg->freq_target_lockout_ticks > 6000U) return 0U;
  if (!in_range_f(cfg->freq_duty_filter_alpha, 0.0f, 1.0f)) return 0U;
  if ((cfg->freq_min_step_hz < HV_CONFIG_FREQ_MIN_STEP_HZ) ||
      (cfg->freq_min_step_hz > HV_CONFIG_FREQ_MAX_STEP_HZ)) return 0U;
  if ((cfg->freq_max_step_hz < cfg->freq_min_step_hz) ||
      (cfg->freq_max_step_hz > HV_CONFIG_FREQ_MAX_HZ)) return 0U;
  if (!in_range_f(cfg->freq_down_trigger_pct, 0.0f, 100.0f)) return 0U;
  if (!in_range_f(cfg->freq_down_fast_pct, 0.0f, 100.0f)) return 0U;
  if (!in_range_f(cfg->freq_down_sat_pct, 0.0f, 100.0f)) return 0U;
  if (!in_range_f(cfg->freq_down_stop_pct, 0.0f, 100.0f)) return 0U;
  if (!in_range_f(cfg->freq_up_trigger_offset_pct, -100.0f, 100.0f)) return 0U;
  if (!in_range_f(cfg->freq_up_stop_slope, 0.0f, 10.0f)) return 0U;
  if (!in_range_f(cfg->freq_up_stop_offset_pct, -100.0f, 200.0f)) return 0U;
  if (!in_range_f(cfg->freq_up_pred_limit_pct, 0.0f, 100.0f)) return 0U;
  if (!in_range_f(cfg->freq_ff_gamma, 0.0f, 4.0f)) return 0U;

  if (cfg->btn_a_enable > 1U) return 0U;
  if (cfg->btn_b_enable > 1U) return 0U;
  if ((cfg->btn_a_cc_ma > HV_CONFIG_BTN_MAX_CC_MA) ||
      (cfg->btn_b_cc_ma > HV_CONFIG_BTN_MAX_CC_MA)) return 0U;
  if ((cfg->btn_a_cv_mv > HV_CONFIG_BTN_MAX_CV_MV) ||
      (cfg->btn_b_cv_mv > HV_CONFIG_BTN_MAX_CV_MV)) return 0U;
  if ((cfg->btn_a_cp_mw > HV_CONFIG_BTN_MAX_CP_MW) ||
      (cfg->btn_b_cp_mw > HV_CONFIG_BTN_MAX_CP_MW)) return 0U;
  if ((cfg->btn_a_time_s > HV_CONFIG_BTN_MAX_TIME_S) ||
      (cfg->btn_b_time_s > HV_CONFIG_BTN_MAX_TIME_S)) return 0U;

  if (cfg->cal_enable > 1U) return 0U;

  return 1U;
}

static void recompute_flags(void)
{
  uint32_t flags = 0U;

  if (flash_config_valid != 0U) flags |= HV_CONFIG_FLAG_FLASH_VALID;
  if ((flash_config_valid == 0U) ||
      (memcmp(&draft_config, &flash_config, sizeof(draft_config)) != 0))
  {
    flags |= HV_CONFIG_FLAG_DRAFT_DIRTY;
  }
  if (memcmp(&active_config, &draft_config, sizeof(active_config)) != 0)
  {
    flags |= HV_CONFIG_FLAG_ACTIVE_DIRTY;
  }
  if (flash_full_latched != 0U) flags |= HV_CONFIG_FLAG_FLASH_FULL;

  config_flags = flags;
}

static uint8_t value_type_for_field(uint16_t field_id, uint8_t *value_type)
{
  switch (field_id)
  {
    case HV_CONFIG_FIELD_KP_CV:
    case HV_CONFIG_FIELD_KI_CV:
    case HV_CONFIG_FIELD_KP_CC:
    case HV_CONFIG_FIELD_KI_CC:
    case HV_CONFIG_FIELD_KP_CP:
    case HV_CONFIG_FIELD_KI_CP:
    case HV_CONFIG_FIELD_SOFT_START_STEP:
    case HV_CONFIG_FIELD_FREQ_SCORE_LIMIT:
    case HV_CONFIG_FIELD_FREQ_DUTY_FILTER_ALPHA:
    case HV_CONFIG_FIELD_FREQ_DOWN_TRIGGER_PCT:
    case HV_CONFIG_FIELD_FREQ_DOWN_FAST_PCT:
    case HV_CONFIG_FIELD_FREQ_DOWN_SAT_PCT:
    case HV_CONFIG_FIELD_FREQ_DOWN_STOP_PCT:
    case HV_CONFIG_FIELD_FREQ_UP_TRIGGER_OFFSET_PCT:
    case HV_CONFIG_FIELD_FREQ_UP_STOP_SLOPE:
    case HV_CONFIG_FIELD_FREQ_UP_STOP_OFFSET_PCT:
    case HV_CONFIG_FIELD_FREQ_UP_PRED_LIMIT_PCT:
    case HV_CONFIG_FIELD_FREQ_FF_GAMMA:
      *value_type = HV_CONFIG_VALUE_FLOAT;
      return 1U;

    case HV_CONFIG_FIELD_BASE_FREQ_HZ:
    case HV_CONFIG_FIELD_FREQ_POLICY:
    case HV_CONFIG_FIELD_FREQ_ENABLE_LOCKOUT_TICKS:
    case HV_CONFIG_FIELD_FREQ_RELOAD_LOCKOUT_TICKS:
    case HV_CONFIG_FIELD_FREQ_TARGET_LOCKOUT_TICKS:
    case HV_CONFIG_FIELD_FREQ_MIN_STEP_HZ:
    case HV_CONFIG_FIELD_FREQ_MAX_STEP_HZ:
    case HV_CONFIG_FIELD_BTN_A_ENABLE:
    case HV_CONFIG_FIELD_BTN_A_CC_MA:
    case HV_CONFIG_FIELD_BTN_A_CV_MV:
    case HV_CONFIG_FIELD_BTN_A_CP_MW:
    case HV_CONFIG_FIELD_BTN_A_TIME_S:
    case HV_CONFIG_FIELD_BTN_B_ENABLE:
    case HV_CONFIG_FIELD_BTN_B_CC_MA:
    case HV_CONFIG_FIELD_BTN_B_CV_MV:
    case HV_CONFIG_FIELD_BTN_B_CP_MW:
    case HV_CONFIG_FIELD_BTN_B_TIME_S:
    case HV_CONFIG_FIELD_CAL_ENABLE:
      *value_type = HV_CONFIG_VALUE_U32;
      return 1U;

    default:
      return 0U;
  }
}

uint8_t ConfigManager_GetField(const HVCCPS_Config *config, uint16_t field_id,
                               uint8_t *value_type, uint32_t *value_u32,
                               float *value_f)
{
  uint8_t type;
  if ((config == NULL) || (value_type == NULL) ||
      (value_u32 == NULL) || (value_f == NULL))
  {
    return HV_CONFIG_STATUS_BAD_REQUEST;
  }

  if (value_type_for_field(field_id, &type) == 0U) return HV_CONFIG_STATUS_BAD_FIELD;
  *value_type = type;
  *value_u32 = 0U;
  *value_f = 0.0f;

  switch (field_id)
  {
    case HV_CONFIG_FIELD_KP_CV: *value_f = config->kp_cv; break;
    case HV_CONFIG_FIELD_KI_CV: *value_f = config->ki_cv; break;
    case HV_CONFIG_FIELD_KP_CC: *value_f = config->kp_cc; break;
    case HV_CONFIG_FIELD_KI_CC: *value_f = config->ki_cc; break;
    case HV_CONFIG_FIELD_KP_CP: *value_f = config->kp_cp; break;
    case HV_CONFIG_FIELD_KI_CP: *value_f = config->ki_cp; break;
    case HV_CONFIG_FIELD_BASE_FREQ_HZ: *value_u32 = config->base_freq_hz; break;
    case HV_CONFIG_FIELD_FREQ_POLICY: *value_u32 = config->freq_policy; break;
    case HV_CONFIG_FIELD_SOFT_START_STEP: *value_f = config->soft_start_step; break;
    case HV_CONFIG_FIELD_FREQ_SCORE_LIMIT: *value_f = config->freq_score_limit; break;
    case HV_CONFIG_FIELD_FREQ_ENABLE_LOCKOUT_TICKS: *value_u32 = config->freq_enable_lockout_ticks; break;
    case HV_CONFIG_FIELD_FREQ_RELOAD_LOCKOUT_TICKS: *value_u32 = config->freq_reload_lockout_ticks; break;
    case HV_CONFIG_FIELD_FREQ_TARGET_LOCKOUT_TICKS: *value_u32 = config->freq_target_lockout_ticks; break;
    case HV_CONFIG_FIELD_FREQ_DUTY_FILTER_ALPHA: *value_f = config->freq_duty_filter_alpha; break;
    case HV_CONFIG_FIELD_FREQ_MIN_STEP_HZ: *value_u32 = config->freq_min_step_hz; break;
    case HV_CONFIG_FIELD_FREQ_MAX_STEP_HZ: *value_u32 = config->freq_max_step_hz; break;
    case HV_CONFIG_FIELD_FREQ_DOWN_TRIGGER_PCT: *value_f = config->freq_down_trigger_pct; break;
    case HV_CONFIG_FIELD_FREQ_DOWN_FAST_PCT: *value_f = config->freq_down_fast_pct; break;
    case HV_CONFIG_FIELD_FREQ_DOWN_SAT_PCT: *value_f = config->freq_down_sat_pct; break;
    case HV_CONFIG_FIELD_FREQ_DOWN_STOP_PCT: *value_f = config->freq_down_stop_pct; break;
    case HV_CONFIG_FIELD_FREQ_UP_TRIGGER_OFFSET_PCT: *value_f = config->freq_up_trigger_offset_pct; break;
    case HV_CONFIG_FIELD_FREQ_UP_STOP_SLOPE: *value_f = config->freq_up_stop_slope; break;
    case HV_CONFIG_FIELD_FREQ_UP_STOP_OFFSET_PCT: *value_f = config->freq_up_stop_offset_pct; break;
    case HV_CONFIG_FIELD_FREQ_UP_PRED_LIMIT_PCT: *value_f = config->freq_up_pred_limit_pct; break;
    case HV_CONFIG_FIELD_FREQ_FF_GAMMA: *value_f = config->freq_ff_gamma; break;
    case HV_CONFIG_FIELD_BTN_A_ENABLE: *value_u32 = config->btn_a_enable; break;
    case HV_CONFIG_FIELD_BTN_A_CC_MA: *value_u32 = config->btn_a_cc_ma; break;
    case HV_CONFIG_FIELD_BTN_A_CV_MV: *value_u32 = config->btn_a_cv_mv; break;
    case HV_CONFIG_FIELD_BTN_A_CP_MW: *value_u32 = config->btn_a_cp_mw; break;
    case HV_CONFIG_FIELD_BTN_A_TIME_S: *value_u32 = config->btn_a_time_s; break;
    case HV_CONFIG_FIELD_BTN_B_ENABLE: *value_u32 = config->btn_b_enable; break;
    case HV_CONFIG_FIELD_BTN_B_CC_MA: *value_u32 = config->btn_b_cc_ma; break;
    case HV_CONFIG_FIELD_BTN_B_CV_MV: *value_u32 = config->btn_b_cv_mv; break;
    case HV_CONFIG_FIELD_BTN_B_CP_MW: *value_u32 = config->btn_b_cp_mw; break;
    case HV_CONFIG_FIELD_BTN_B_TIME_S: *value_u32 = config->btn_b_time_s; break;
    case HV_CONFIG_FIELD_CAL_ENABLE: *value_u32 = config->cal_enable; break;
    default: return HV_CONFIG_STATUS_BAD_FIELD;
  }

  return HV_CONFIG_STATUS_OK;
}

static uint8_t set_field(HVCCPS_Config *config, uint16_t field_id, uint8_t value_type,
                         uint32_t value_u32, float value_f)
{
  uint8_t expected_type;
  HVCCPS_Config candidate;

  if (value_type_for_field(field_id, &expected_type) == 0U) return HV_CONFIG_STATUS_BAD_FIELD;
  if (value_type != expected_type) return HV_CONFIG_STATUS_BAD_TYPE;

  candidate = *config;
  switch (field_id)
  {
    case HV_CONFIG_FIELD_KP_CV: candidate.kp_cv = value_f; break;
    case HV_CONFIG_FIELD_KI_CV: candidate.ki_cv = value_f; break;
    case HV_CONFIG_FIELD_KP_CC: candidate.kp_cc = value_f; break;
    case HV_CONFIG_FIELD_KI_CC: candidate.ki_cc = value_f; break;
    case HV_CONFIG_FIELD_KP_CP: candidate.kp_cp = value_f; break;
    case HV_CONFIG_FIELD_KI_CP: candidate.ki_cp = value_f; break;
    case HV_CONFIG_FIELD_BASE_FREQ_HZ: candidate.base_freq_hz = value_u32; break;
    case HV_CONFIG_FIELD_FREQ_POLICY: candidate.freq_policy = value_u32; break;
    case HV_CONFIG_FIELD_SOFT_START_STEP: candidate.soft_start_step = value_f; break;
    case HV_CONFIG_FIELD_FREQ_SCORE_LIMIT: candidate.freq_score_limit = value_f; break;
    case HV_CONFIG_FIELD_FREQ_ENABLE_LOCKOUT_TICKS: candidate.freq_enable_lockout_ticks = value_u32; break;
    case HV_CONFIG_FIELD_FREQ_RELOAD_LOCKOUT_TICKS: candidate.freq_reload_lockout_ticks = value_u32; break;
    case HV_CONFIG_FIELD_FREQ_TARGET_LOCKOUT_TICKS: candidate.freq_target_lockout_ticks = value_u32; break;
    case HV_CONFIG_FIELD_FREQ_DUTY_FILTER_ALPHA: candidate.freq_duty_filter_alpha = value_f; break;
    case HV_CONFIG_FIELD_FREQ_MIN_STEP_HZ: candidate.freq_min_step_hz = value_u32; break;
    case HV_CONFIG_FIELD_FREQ_MAX_STEP_HZ: candidate.freq_max_step_hz = value_u32; break;
    case HV_CONFIG_FIELD_FREQ_DOWN_TRIGGER_PCT: candidate.freq_down_trigger_pct = value_f; break;
    case HV_CONFIG_FIELD_FREQ_DOWN_FAST_PCT: candidate.freq_down_fast_pct = value_f; break;
    case HV_CONFIG_FIELD_FREQ_DOWN_SAT_PCT: candidate.freq_down_sat_pct = value_f; break;
    case HV_CONFIG_FIELD_FREQ_DOWN_STOP_PCT: candidate.freq_down_stop_pct = value_f; break;
    case HV_CONFIG_FIELD_FREQ_UP_TRIGGER_OFFSET_PCT: candidate.freq_up_trigger_offset_pct = value_f; break;
    case HV_CONFIG_FIELD_FREQ_UP_STOP_SLOPE: candidate.freq_up_stop_slope = value_f; break;
    case HV_CONFIG_FIELD_FREQ_UP_STOP_OFFSET_PCT: candidate.freq_up_stop_offset_pct = value_f; break;
    case HV_CONFIG_FIELD_FREQ_UP_PRED_LIMIT_PCT: candidate.freq_up_pred_limit_pct = value_f; break;
    case HV_CONFIG_FIELD_FREQ_FF_GAMMA: candidate.freq_ff_gamma = value_f; break;
    case HV_CONFIG_FIELD_BTN_A_ENABLE: candidate.btn_a_enable = value_u32; break;
    case HV_CONFIG_FIELD_BTN_A_CC_MA: candidate.btn_a_cc_ma = value_u32; break;
    case HV_CONFIG_FIELD_BTN_A_CV_MV: candidate.btn_a_cv_mv = value_u32; break;
    case HV_CONFIG_FIELD_BTN_A_CP_MW: candidate.btn_a_cp_mw = value_u32; break;
    case HV_CONFIG_FIELD_BTN_A_TIME_S: candidate.btn_a_time_s = value_u32; break;
    case HV_CONFIG_FIELD_BTN_B_ENABLE: candidate.btn_b_enable = value_u32; break;
    case HV_CONFIG_FIELD_BTN_B_CC_MA: candidate.btn_b_cc_ma = value_u32; break;
    case HV_CONFIG_FIELD_BTN_B_CV_MV: candidate.btn_b_cv_mv = value_u32; break;
    case HV_CONFIG_FIELD_BTN_B_CP_MW: candidate.btn_b_cp_mw = value_u32; break;
    case HV_CONFIG_FIELD_BTN_B_TIME_S: candidate.btn_b_time_s = value_u32; break;
    case HV_CONFIG_FIELD_CAL_ENABLE: candidate.cal_enable = value_u32; break;
    default: return HV_CONFIG_STATUS_BAD_FIELD;
  }

  if (validate_config(&candidate) == 0U) return HV_CONFIG_STATUS_BAD_VALUE;
  *config = candidate;
  return HV_CONFIG_STATUS_OK;
}

uint8_t ConfigManager_SetDraftField(uint16_t field_id, uint8_t value_type,
                                    uint32_t value_u32, float value_f)
{
  uint8_t status = set_field(&draft_config, field_id, value_type, value_u32, value_f);
  if (status == HV_CONFIG_STATUS_OK)
  {
    draft_revision++;
    recompute_flags();
  }
  return status;
}

uint8_t ConfigManager_ResetDraftField(uint16_t field_id)
{
  HVCCPS_Config defaults;
  uint8_t value_type;
  uint32_t value_u32;
  float value_f;

  load_defaults(&defaults);
  if (ConfigManager_GetField(&defaults, field_id, &value_type, &value_u32, &value_f) != HV_CONFIG_STATUS_OK)
  {
    return HV_CONFIG_STATUS_BAD_FIELD;
  }
  return ConfigManager_SetDraftField(field_id, value_type, value_u32, value_f);
}

static uint8_t flash_record_valid(const HV_ConfigFlashRecord *record)
{
  if (record->magic != HV_CONFIG_MAGIC) return 0U;
  if (record->record_version != HV_CONFIG_RECORD_VERSION) return 0U;
  if (record->schema_version != HV_CONFIG_SCHEMA_VERSION) return 0U;
  if (record->length != HV_CONFIG_RECORD_DATA_BYTES) return 0U;
  if (record->crc != config_crc(record)) return 0U;
  if (validate_config(&record->config) == 0U) return 0U;
  return 1U;
}

static uint32_t flash_find_write_offset(void)
{
  uint32_t offset;
  const HV_ConfigFlashRecord *record;

  for (offset = 0U;
       (offset + HV_CONFIG_RECORD_BYTES) <= HV_CONFIG_FLASH_PAGE_BYTES;
       offset += HV_CONFIG_RECORD_BYTES)
  {
    record = (const HV_ConfigFlashRecord *)(HV_CONFIG_FLASH_PAGE_ADDR + offset);
    if (record->magic == 0xFFFFFFFFUL) return offset;
    if (flash_record_valid(record) == 0U) return HV_CONFIG_FLASH_PAGE_BYTES;
  }

  return HV_CONFIG_FLASH_PAGE_BYTES;
}

static uint8_t flash_load_latest(HVCCPS_Config *cfg, uint32_t *sequence)
{
  uint32_t offset;
  uint8_t found = 0U;
  uint32_t best_sequence = 0U;
  const HV_ConfigFlashRecord *record;

  for (offset = 0U;
       (offset + HV_CONFIG_RECORD_BYTES) <= HV_CONFIG_FLASH_PAGE_BYTES;
       offset += HV_CONFIG_RECORD_BYTES)
  {
    record = (const HV_ConfigFlashRecord *)(HV_CONFIG_FLASH_PAGE_ADDR + offset);
    if (record->magic == 0xFFFFFFFFUL) break;
    if (flash_record_valid(record) == 0U) break;
    if ((found == 0U) || (record->sequence > best_sequence))
    {
      found = 1U;
      best_sequence = record->sequence;
      *cfg = record->config;
    }
  }

  if (found != 0U)
  {
    *sequence = best_sequence;
    return 1U;
  }

  return 0U;
}

static uint8_t flash_erase_page(void)
{
  FLASH_EraseInitTypeDef erase;
  uint32_t page_error = 0U;
  HAL_StatusTypeDef status;

  erase.TypeErase = FLASH_TYPEERASE_PAGES;
  erase.Banks = FLASH_BANK_1;
  erase.Page = HV_CONFIG_FLASH_PAGE_INDEX;
  erase.NbPages = 1U;

  HAL_FLASH_Unlock();
  status = HAL_FLASHEx_Erase(&erase, &page_error);
  HAL_FLASH_Lock();

  return (status == HAL_OK) ? 1U : 0U;
}

static uint8_t flash_program_record(uint32_t offset, const HVCCPS_Config *cfg, uint32_t sequence)
{
  HV_ConfigFlashRecord record;
  uint32_t address;
  uint32_t i;
  const uint64_t *words;
  HAL_StatusTypeDef status = HAL_OK;

  if ((offset + HV_CONFIG_RECORD_BYTES) > HV_CONFIG_FLASH_PAGE_BYTES) return 0U;

  memset(&record, 0xFF, sizeof(record));
  record.magic = HV_CONFIG_MAGIC;
  record.record_version = HV_CONFIG_RECORD_VERSION;
  record.schema_version = HV_CONFIG_SCHEMA_VERSION;
  record.sequence = sequence;
  record.length = HV_CONFIG_RECORD_DATA_BYTES;
  record.config = *cfg;
  record.crc = config_crc(&record);

  address = HV_CONFIG_FLASH_PAGE_ADDR + offset;
  words = (const uint64_t *)(const void *)&record;

  HAL_FLASH_Unlock();
  for (i = 0U; i < ((sizeof(record) + 7U) / 8U); i++)
  {
    status = HAL_FLASH_Program(FLASH_TYPEPROGRAM_DOUBLEWORD,
                               address + (i * 8U), words[i]);
    if (status != HAL_OK) break;
  }
  HAL_FLASH_Lock();

  return (status == HAL_OK) ? 1U : 0U;
}

static uint8_t flash_append_config(const HVCCPS_Config *cfg)
{
  uint32_t offset = flash_find_write_offset();
  uint32_t sequence = flash_sequence + 1U;

  flash_full_latched = 0U;
  if ((offset + HV_CONFIG_RECORD_BYTES) > HV_CONFIG_FLASH_PAGE_BYTES)
  {
    flash_full_latched = 1U;
    recompute_flags();
    if (flash_erase_page() == 0U) return HV_CONFIG_STATUS_FLASH_ERROR;
    offset = 0U;
  }

  if (flash_program_record(offset, cfg, sequence) == 0U) return HV_CONFIG_STATUS_FLASH_ERROR;
  flash_sequence = sequence;
  return HV_CONFIG_STATUS_OK;
}

void ConfigManager_Init(void)
{
  uint32_t seq = 0U;
  HVCCPS_Config from_flash;

  config_flags = 0U;
  flash_config_valid = 0U;
  flash_full_latched = 0U;
  draft_revision = 0U;
  active_revision = 0U;
  flash_sequence = 0U;

  if (flash_load_latest(&from_flash, &seq) != 0U)
  {
    draft_config = from_flash;
    active_config = from_flash;
    flash_config = from_flash;
    flash_config_valid = 1U;
    flash_sequence = seq;
  }
  else
  {
    load_defaults(&draft_config);
    active_config = draft_config;
  }

  recompute_flags();
}

const HVCCPS_Config *ConfigManager_Draft(void)
{
  return &draft_config;
}

const HVCCPS_Config *ConfigManager_Active(void)
{
  return &active_config;
}

void ConfigManager_GetSnapshot(HVCCPS_ConfigSnapshot *snapshot)
{
  if (snapshot == NULL) return;
  snapshot->schema_version = HV_CONFIG_SCHEMA_VERSION;
  snapshot->draft_revision = draft_revision;
  snapshot->active_revision = active_revision;
  snapshot->flash_sequence = flash_sequence;
  snapshot->flags = config_flags;
  snapshot->draft = draft_config;
  snapshot->active = active_config;
}

void ConfigManager_LoadDefaultsToDraft(void)
{
  load_defaults(&draft_config);
  draft_revision++;
  recompute_flags();
}

uint8_t ConfigManager_LoadFlashToDraft(void)
{
  uint32_t seq = 0U;
  HVCCPS_Config from_flash;

  if (flash_load_latest(&from_flash, &seq) == 0U) return HV_CONFIG_STATUS_NO_FLASH;
  draft_config = from_flash;
  flash_config = from_flash;
  flash_config_valid = 1U;
  flash_sequence = seq;
  draft_revision++;
  recompute_flags();
  return HV_CONFIG_STATUS_OK;
}

uint8_t ConfigManager_ApplyDraft(void)
{
  if (validate_config(&draft_config) == 0U) return HV_CONFIG_STATUS_BAD_VALUE;
  active_config = draft_config;
  active_revision++;
  recompute_flags();
  return HV_CONFIG_STATUS_OK;
}

uint8_t ConfigManager_SaveDraftToFlash(void)
{
  uint8_t status;
  if (validate_config(&draft_config) == 0U) return HV_CONFIG_STATUS_BAD_VALUE;
  status = flash_append_config(&draft_config);
  if (status == HV_CONFIG_STATUS_OK)
  {
    flash_config = draft_config;
    flash_config_valid = 1U;
    recompute_flags();
  }
  return status;
}

uint8_t ConfigManager_FactoryResetFlashAndDraft(void)
{
  if (flash_erase_page() == 0U) return HV_CONFIG_STATUS_FLASH_ERROR;
  load_defaults(&draft_config);
  active_config = draft_config;
  draft_revision++;
  active_revision++;
  flash_sequence = 0U;
  flash_config_valid = 0U;
  flash_full_latched = 0U;
  recompute_flags();
  return HV_CONFIG_STATUS_OK;
}
