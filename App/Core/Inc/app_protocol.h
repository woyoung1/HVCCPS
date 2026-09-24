/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file    app_protocol.h
  * @brief   Serial frame helpers for run control, heartbeat and configuration.
  ******************************************************************************
  */
/* USER CODE END Header */

#ifndef __APP_PROTOCOL_H__
#define __APP_PROTOCOL_H__

#ifdef __cplusplus
extern "C" {
#endif

#include "config_manager.h"
#include <stdint.h>

#define APP_HEARTBEAT_HEADER          0x55U
#define APP_COMMAND_HEADER            0xAAU
#define APP_COMMAND_LEN               23U

#define APP_CONFIG_REQUEST_HEADER     0xC5U
#define APP_CONFIG_REQUEST_LEN        16U
#define APP_CONFIG_RESPONSE_HEADER    0xC6U
/* GET_SNAPSHOT carries two full configs. With the per-key presets and the
 * calibration-enable flag each config is 36 fields x 4 = 144 B, so the
 * worst-case response is 25 (fixed header) + 2*144 + 2 (sum/xor) = 315 B. */
#define APP_CONFIG_RESPONSE_MAX_LEN   320U

#define APP_CONFIG_OP_GET_SNAPSHOT    1U
#define APP_CONFIG_OP_GET_FIELD       2U
#define APP_CONFIG_OP_SET_FIELD       3U
#define APP_CONFIG_OP_RESET_FIELD     4U
#define APP_CONFIG_OP_APPLY_DRAFT     5U
#define APP_CONFIG_OP_SAVE_DRAFT      6U
#define APP_CONFIG_OP_LOAD_FLASH      7U
#define APP_CONFIG_OP_LOAD_DEFAULTS   8U
#define APP_CONFIG_OP_FACTORY_RESET   9U

#define APP_CMD_BIT_ENABLE            0x01U
#define APP_CMD_BIT_DISABLE           0x02U
#define APP_CMD_BIT_FIXED_DUTY        0x04U

/* Calibration-table upload. The table is far larger than one frame, so it is
 * streamed in chunks with a stop-and-wait handshake (the host waits for each
 * 0xC8 response before sending the next frame, so the 192-byte RX FIFO never
 * holds more than one cal frame). DATA frame layout:
 *   [0]=0xC7 [1]=len [2]=op [3]=rsv [4..7]=offset(le32)
 *   [8..9]=chunk_len(le16) [10..]=chunk [len-2]=sum8 [len-1]=xor8
 * BEGIN carries total_len(le32 @4) and expected_crc(le32 @8). */
#define APP_CAL_REQUEST_HEADER        0xC7U
#define APP_CAL_RESPONSE_HEADER       0xC8U
#define APP_CAL_RESPONSE_LEN          26U
#define APP_CAL_MAX_CHUNK             128U
#define APP_CAL_REQUEST_MAX_LEN       (12U + APP_CAL_MAX_CHUNK)   /* 140 */
#define APP_CAL_REQUEST_MIN_LEN       6U

#define APP_CAL_OP_BEGIN              1U
#define APP_CAL_OP_DATA               2U
#define APP_CAL_OP_COMMIT             3U
#define APP_CAL_OP_GET_INFO           4U

typedef struct
{
  uint8_t op;
  uint8_t target;
  uint16_t field_id;
  uint8_t value_type;
  uint32_t value_u32;
  float value_f;
  uint16_t sequence;
} APP_ConfigRequest;

uint8_t APP_Protocol_Sum8(const uint8_t *data, uint16_t len);
uint8_t APP_Protocol_Xor8(const uint8_t *data, uint16_t len);
uint16_t APP_Protocol_ReadLe16(const uint8_t *data);
uint32_t APP_Protocol_ReadLe32(const uint8_t *data);
float APP_Protocol_ReadFloat(const uint8_t *data);
void APP_Protocol_WriteLe16(uint8_t *data, uint16_t value);
void APP_Protocol_WriteLe32(uint8_t *data, uint32_t value);
void APP_Protocol_WriteFloat(uint8_t *data, float value);

uint8_t APP_Protocol_ParseConfigRequest(const uint8_t *frame, APP_ConfigRequest *request);
uint16_t APP_Protocol_BuildConfigResponse(uint8_t *frame, uint16_t capacity,
                                          const APP_ConfigRequest *request,
                                          uint8_t status,
                                          const HVCCPS_ConfigSnapshot *snapshot);
uint16_t APP_Protocol_WriteConfig(uint8_t *data, const HVCCPS_Config *config);

#ifdef __cplusplus
}
#endif

#endif /* __APP_PROTOCOL_H__ */
