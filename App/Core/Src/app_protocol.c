/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file    app_protocol.c
  * @brief   Serial protocol helpers.
  ******************************************************************************
  */
/* USER CODE END Header */

#include "app_protocol.h"

#include <string.h>

uint8_t APP_Protocol_Sum8(const uint8_t *data, uint16_t len)
{
  uint8_t sum = 0U;
  uint16_t i;
  for (i = 0U; i < len; i++) sum = (uint8_t)(sum + data[i]);
  return sum;
}

uint8_t APP_Protocol_Xor8(const uint8_t *data, uint16_t len)
{
  uint8_t value = 0U;
  uint16_t i;
  for (i = 0U; i < len; i++) value = (uint8_t)(value ^ data[i]);
  return value;
}

uint16_t APP_Protocol_ReadLe16(const uint8_t *data)
{
  return (uint16_t)(((uint16_t)data[0]) | ((uint16_t)data[1] << 8));
}

uint32_t APP_Protocol_ReadLe32(const uint8_t *data)
{
  return ((uint32_t)data[0]) |
         ((uint32_t)data[1] << 8) |
         ((uint32_t)data[2] << 16) |
         ((uint32_t)data[3] << 24);
}

float APP_Protocol_ReadFloat(const uint8_t *data)
{
  float value;
  memcpy(&value, data, sizeof(value));
  return value;
}

void APP_Protocol_WriteLe16(uint8_t *data, uint16_t value)
{
  data[0] = (uint8_t)(value & 0xFFU);
  data[1] = (uint8_t)((value >> 8) & 0xFFU);
}

void APP_Protocol_WriteLe32(uint8_t *data, uint32_t value)
{
  data[0] = (uint8_t)(value & 0xFFU);
  data[1] = (uint8_t)((value >> 8) & 0xFFU);
  data[2] = (uint8_t)((value >> 16) & 0xFFU);
  data[3] = (uint8_t)((value >> 24) & 0xFFU);
}

void APP_Protocol_WriteFloat(uint8_t *data, float value)
{
  memcpy(data, &value, sizeof(value));
}

uint8_t APP_Protocol_ParseConfigRequest(const uint8_t *frame, APP_ConfigRequest *request)
{
  if ((frame == 0) || (request == 0)) return 0U;
  if (frame[0] != APP_CONFIG_REQUEST_HEADER) return 0U;
  if (frame[1] != APP_CONFIG_REQUEST_LEN) return 0U;
  if (frame[APP_CONFIG_REQUEST_LEN - 2U] != APP_Protocol_Sum8(frame, APP_CONFIG_REQUEST_LEN - 2U)) return 0U;
  if (frame[APP_CONFIG_REQUEST_LEN - 1U] != APP_Protocol_Xor8(frame, APP_CONFIG_REQUEST_LEN - 1U)) return 0U;

  request->op = frame[2];
  request->target = frame[3];
  request->field_id = APP_Protocol_ReadLe16(&frame[4]);
  request->value_type = frame[6];
  request->value_u32 = APP_Protocol_ReadLe32(&frame[7]);
  request->value_f = APP_Protocol_ReadFloat(&frame[7]);
  request->sequence = APP_Protocol_ReadLe16(&frame[11]);
  return 1U;
}

uint16_t APP_Protocol_WriteConfig(uint8_t *data, const HVCCPS_Config *config)
{
  uint16_t off = 0U;

  APP_Protocol_WriteFloat(&data[off], config->kp_cv); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->ki_cv); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->kp_cc); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->ki_cc); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->kp_cp); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->ki_cp); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->base_freq_hz); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->freq_policy); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->soft_start_step); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_score_limit); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->freq_enable_lockout_ticks); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->freq_reload_lockout_ticks); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->freq_target_lockout_ticks); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_duty_filter_alpha); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->freq_min_step_hz); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->freq_max_step_hz); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_down_trigger_pct); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_down_fast_pct); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_down_sat_pct); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_down_stop_pct); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_up_trigger_offset_pct); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_up_stop_slope); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_up_stop_offset_pct); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_up_pred_limit_pct); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteFloat(&data[off], config->freq_ff_gamma); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_a_enable); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_a_cc_ma); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_a_cv_mv); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_a_cp_mw); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_a_time_s); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_b_enable); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_b_cc_ma); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_b_cv_mv); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_b_cp_mw); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->btn_b_time_s); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&data[off], config->cal_enable); off = (uint16_t)(off + 4U);

  return off;
}

uint16_t APP_Protocol_BuildConfigResponse(uint8_t *frame, uint16_t capacity,
                                          const APP_ConfigRequest *request,
                                          uint8_t status,
                                          const HVCCPS_ConfigSnapshot *snapshot)
{
  uint16_t off = 0U;
  uint16_t total_len;
  uint8_t value_type = 0U;
  uint32_t value_u32 = 0U;
  float value_f = 0.0f;
  const HVCCPS_Config *target_config;

  if ((frame == 0) || (request == 0) || (snapshot == 0)) return 0U;

  total_len = 1U + 2U + 1U + 1U + 2U + 2U + 4U + 4U + 4U + 4U;
  if (request->op == APP_CONFIG_OP_GET_SNAPSHOT)
  {
    /* draft + active, each = sizeof(HVCCPS_Config) on the wire = 36 fields x 4 = 144 B */
    total_len = (uint16_t)(total_len + (2U * 144U));
  }
  else if (request->op == APP_CONFIG_OP_GET_FIELD)
  {
    total_len = (uint16_t)(total_len + 1U + 4U);
  }
  total_len = (uint16_t)(total_len + 2U);

  if (total_len > capacity) return 0U;

  frame[off++] = APP_CONFIG_RESPONSE_HEADER;
  APP_Protocol_WriteLe16(&frame[off], total_len); off = (uint16_t)(off + 2U);
  frame[off++] = request->op;
  frame[off++] = status;
  APP_Protocol_WriteLe16(&frame[off], request->sequence); off = (uint16_t)(off + 2U);
  APP_Protocol_WriteLe16(&frame[off], request->field_id); off = (uint16_t)(off + 2U);
  APP_Protocol_WriteLe32(&frame[off], snapshot->draft_revision); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&frame[off], snapshot->active_revision); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&frame[off], snapshot->flash_sequence); off = (uint16_t)(off + 4U);
  APP_Protocol_WriteLe32(&frame[off], snapshot->flags); off = (uint16_t)(off + 4U);

  if (request->op == APP_CONFIG_OP_GET_SNAPSHOT)
  {
    off = (uint16_t)(off + APP_Protocol_WriteConfig(&frame[off], &snapshot->draft));
    off = (uint16_t)(off + APP_Protocol_WriteConfig(&frame[off], &snapshot->active));
  }
  else if (request->op == APP_CONFIG_OP_GET_FIELD)
  {
    target_config = (request->target == HV_CONFIG_TARGET_ACTIVE) ? &snapshot->active : &snapshot->draft;
    if (status == HV_CONFIG_STATUS_OK)
    {
      (void)ConfigManager_GetField(target_config, request->field_id, &value_type, &value_u32, &value_f);
    }
    frame[off++] = value_type;
    if (value_type == HV_CONFIG_VALUE_FLOAT) APP_Protocol_WriteFloat(&frame[off], value_f);
    else APP_Protocol_WriteLe32(&frame[off], value_u32);
    off = (uint16_t)(off + 4U);
  }

  frame[off++] = APP_Protocol_Sum8(frame, (uint16_t)(total_len - 2U));
  frame[off++] = APP_Protocol_Xor8(frame, (uint16_t)(total_len - 1U));
  return total_len;
}
