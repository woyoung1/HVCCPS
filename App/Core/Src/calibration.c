/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file    calibration.c
  * @brief   Output V/I calibration: flash store, validation and ISR lookups.
  ******************************************************************************
  */
/* USER CODE END Header */

#include "calibration.h"

#include "main.h"
#include "stm32g4xx_hal_flash.h"
#include "stm32g4xx_hal_flash_ex.h"
#include <stddef.h>
#include <string.h>

/* Header field byte offsets inside the image (see calibration.h layout). */
#define HV_CAL_OFF_MAGIC     0U
#define HV_CAL_OFF_CRC       4U
#define HV_CAL_OFF_VERSION   8U
#define HV_CAL_OFF_VPOINTS   12U
#define HV_CAL_OFF_IPOINTS   16U
#define HV_CAL_OFF_VSTEP     20U
#define HV_CAL_OFF_ISTEP     24U
#define HV_CAL_OFF_VMAX      28U
#define HV_CAL_OFF_IMAX      32U
#define HV_CAL_OFF_FLAGS     36U
#define HV_CAL_OFF_DATALEN   40U

/* RAM staging buffer, padded to a flash double-word so it programs cleanly. */
#define HV_CAL_STAGE_BYTES   (((HV_CAL_IMAGE_BYTES) + 7U) & ~7U)

static uint8_t  s_valid;
static uint32_t s_version;
static uint32_t s_crc;
static const int16_t *s_di;   /* -> flash dI[HV_CAL_I_POINTS]                 */
static const int16_t *s_dv;   /* -> flash dV[HV_CAL_V_POINTS*HV_CAL_I_POINTS] */

static uint8_t  s_stage[HV_CAL_STAGE_BYTES];
static uint8_t  s_stage_active;
static uint32_t s_stage_expected_crc;

static uint32_t rd_u32(const uint8_t *p)
{
  return ((uint32_t)p[0]) | ((uint32_t)p[1] << 8) |
         ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

/* zlib CRC32 (reflected, poly 0xEDB88320), matching the host compiler and the
 * config-log records. */
static uint32_t crc32_calc(const uint8_t *data, uint32_t len)
{
  uint32_t crc = 0xFFFFFFFFUL;
  uint32_t i;
  uint8_t bit;

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

static uint8_t validate_image(const uint8_t *img)
{
  uint32_t crc;

  if (rd_u32(&img[HV_CAL_OFF_MAGIC]) != HV_CAL_MAGIC) return HV_CAL_STATUS_BAD_CRC;
  if (rd_u32(&img[HV_CAL_OFF_VERSION]) != HV_CAL_VERSION) return HV_CAL_STATUS_BAD_DIMS;
  if (rd_u32(&img[HV_CAL_OFF_VPOINTS]) != HV_CAL_V_POINTS) return HV_CAL_STATUS_BAD_DIMS;
  if (rd_u32(&img[HV_CAL_OFF_IPOINTS]) != HV_CAL_I_POINTS) return HV_CAL_STATUS_BAD_DIMS;
  if (rd_u32(&img[HV_CAL_OFF_VSTEP]) != HV_CAL_V_STEP_MV) return HV_CAL_STATUS_BAD_DIMS;
  if (rd_u32(&img[HV_CAL_OFF_ISTEP]) != HV_CAL_I_STEP_MA) return HV_CAL_STATUS_BAD_DIMS;
  if (rd_u32(&img[HV_CAL_OFF_DATALEN]) != HV_CAL_DATA_BYTES) return HV_CAL_STATUS_BAD_LEN;

  crc = crc32_calc(&img[HV_CAL_CRC_COVER_START],
                   HV_CAL_IMAGE_BYTES - HV_CAL_CRC_COVER_START);
  if (crc != rd_u32(&img[HV_CAL_OFF_CRC])) return HV_CAL_STATUS_BAD_CRC;

  return HV_CAL_STATUS_OK;
}

void Calibration_Init(void)
{
  const uint8_t *flash = (const uint8_t *)HV_CAL_FLASH_PAGE_ADDR;

  s_valid = 0U;
  s_version = 0U;
  s_crc = 0U;
  s_di = NULL;
  s_dv = NULL;

  if (validate_image(flash) == HV_CAL_STATUS_OK)
  {
    s_di = (const int16_t *)(const void *)(HV_CAL_FLASH_PAGE_ADDR + HV_CAL_DI_OFFSET);
    s_dv = (const int16_t *)(const void *)(HV_CAL_FLASH_PAGE_ADDR + HV_CAL_DV_OFFSET);
    s_version = rd_u32(&flash[HV_CAL_OFF_VERSION]);
    s_crc = rd_u32(&flash[HV_CAL_OFF_CRC]);
    s_valid = 1U;
  }
}

uint8_t Calibration_IsValid(void)
{
  return s_valid;
}

void Calibration_GetInfo(HV_CalInfo *info)
{
  if (info == NULL) return;
  info->valid = s_valid;
  info->version = s_version;
  info->data_crc = s_crc;
  info->v_points = (uint16_t)HV_CAL_V_POINTS;
  info->i_points = (uint16_t)HV_CAL_I_POINTS;
}

uint32_t Calibration_ApplyCurrent(uint32_t i_raw_ma)
{
  float x;
  float di;
  float corr;
  float result;
  uint32_t i0;

  if (s_valid == 0U) return i_raw_ma;

  x = (float)i_raw_ma / (float)HV_CAL_I_STEP_MA;
  if (x <= 0.0f)
  {
    di = (float)s_di[0];
  }
  else if (x >= (float)(HV_CAL_I_POINTS - 1U))
  {
    di = (float)s_di[HV_CAL_I_POINTS - 1U];
  }
  else
  {
    i0 = (uint32_t)x;
    di = (float)s_di[i0] + (((float)s_di[i0 + 1U] - (float)s_di[i0]) * (x - (float)i0));
  }

  corr = di * 0.1f;   /* 0.1 mA units -> mA */
  if (corr > (float)HV_CAL_MAX_DI_MA) corr = (float)HV_CAL_MAX_DI_MA;
  else if (corr < -(float)HV_CAL_MAX_DI_MA) corr = -(float)HV_CAL_MAX_DI_MA;

  result = (float)i_raw_ma + corr;
  if (result < 0.0f) result = 0.0f;
  return (uint32_t)(result + 0.5f);
}

uint32_t Calibration_ApplyVoltage(uint32_t v_raw_mv, uint32_t i_cal_ma)
{
  float xv;
  float xi;
  float fv;
  float fi;
  float d00;
  float d10;
  float d01;
  float d11;
  float a;
  float b;
  float dv;
  float corr;
  float result;
  uint32_t v0;
  uint32_t v1;
  uint32_t i0;
  uint32_t i1;

  if (s_valid == 0U) return v_raw_mv;

  xv = (float)v_raw_mv / (float)HV_CAL_V_STEP_MV;
  xi = (float)i_cal_ma / (float)HV_CAL_I_STEP_MA;
  if (xv < 0.0f) xv = 0.0f;
  if (xv > (float)(HV_CAL_V_POINTS - 1U)) xv = (float)(HV_CAL_V_POINTS - 1U);
  if (xi < 0.0f) xi = 0.0f;
  if (xi > (float)(HV_CAL_I_POINTS - 1U)) xi = (float)(HV_CAL_I_POINTS - 1U);

  v0 = (uint32_t)xv;
  v1 = ((v0 + 1U) < HV_CAL_V_POINTS) ? (v0 + 1U) : v0;
  fv = xv - (float)v0;
  i0 = (uint32_t)xi;
  i1 = ((i0 + 1U) < HV_CAL_I_POINTS) ? (i0 + 1U) : i0;
  fi = xi - (float)i0;

  d00 = (float)s_dv[(v0 * HV_CAL_I_POINTS) + i0];
  d10 = (float)s_dv[(v1 * HV_CAL_I_POINTS) + i0];
  d01 = (float)s_dv[(v0 * HV_CAL_I_POINTS) + i1];
  d11 = (float)s_dv[(v1 * HV_CAL_I_POINTS) + i1];
  a = d00 + ((d10 - d00) * fv);
  b = d01 + ((d11 - d01) * fv);
  dv = a + ((b - a) * fi);   /* 0.1 V units */

  corr = dv * 100.0f;        /* 0.1 V -> mV */
  if (corr > (float)HV_CAL_MAX_DV_MV) corr = (float)HV_CAL_MAX_DV_MV;
  else if (corr < -(float)HV_CAL_MAX_DV_MV) corr = -(float)HV_CAL_MAX_DV_MV;

  result = (float)v_raw_mv + corr;
  if (result < 0.0f) result = 0.0f;
  return (uint32_t)(result + 0.5f);
}

static uint8_t flash_erase_region(void)
{
  FLASH_EraseInitTypeDef erase;
  uint32_t page_error = 0U;
  HAL_StatusTypeDef status;

  erase.TypeErase = FLASH_TYPEERASE_PAGES;
  erase.Banks = FLASH_BANK_1;
  erase.Page = HV_CAL_FLASH_FIRST_PAGE;
  erase.NbPages = HV_CAL_FLASH_PAGE_COUNT;

  HAL_FLASH_Unlock();
  status = HAL_FLASHEx_Erase(&erase, &page_error);
  HAL_FLASH_Lock();

  return (status == HAL_OK) ? 1U : 0U;
}

static uint8_t flash_program_region(const uint8_t *buf, uint32_t len)
{
  uint32_t i;
  uint32_t words = len / 8U;
  uint64_t dword;
  HAL_StatusTypeDef status = HAL_OK;

  HAL_FLASH_Unlock();
  for (i = 0U; i < words; i++)
  {
    memcpy(&dword, &buf[i * 8U], 8U);
    status = HAL_FLASH_Program(FLASH_TYPEPROGRAM_DOUBLEWORD,
                               HV_CAL_FLASH_PAGE_ADDR + (i * 8U), dword);
    if (status != HAL_OK) break;
  }
  HAL_FLASH_Lock();

  return (status == HAL_OK) ? 1U : 0U;
}

uint8_t Calibration_StageBegin(uint32_t total_len, uint32_t expected_crc)
{
  if (total_len != HV_CAL_IMAGE_BYTES) return HV_CAL_STATUS_BAD_LEN;
  memset(s_stage, 0xFF, sizeof(s_stage));
  s_stage_expected_crc = expected_crc;
  s_stage_active = 1U;
  return HV_CAL_STATUS_OK;
}

uint8_t Calibration_StageData(uint32_t offset, const uint8_t *data, uint32_t len)
{
  if (s_stage_active == 0U) return HV_CAL_STATUS_BAD_REQUEST;
  if ((data == NULL) || (len == 0U)) return HV_CAL_STATUS_BAD_REQUEST;
  if ((offset > HV_CAL_IMAGE_BYTES) || (len > HV_CAL_IMAGE_BYTES) ||
      ((offset + len) > HV_CAL_IMAGE_BYTES))
  {
    return HV_CAL_STATUS_BAD_LEN;
  }
  memcpy(&s_stage[offset], data, len);
  return HV_CAL_STATUS_OK;
}

uint8_t Calibration_StageCommit(void)
{
  uint8_t status;

  if (s_stage_active == 0U) return HV_CAL_STATUS_BAD_REQUEST;
  s_stage_active = 0U;

  status = validate_image(s_stage);
  if (status != HV_CAL_STATUS_OK) return status;
  if (rd_u32(&s_stage[HV_CAL_OFF_CRC]) != s_stage_expected_crc) return HV_CAL_STATUS_BAD_CRC;

  /* Disable lookups for the write window: the control ISR keeps running (output
   * is off, so duty is held at 0) and must not read a half-programmed table. */
  s_valid = 0U;

  if (flash_erase_region() == 0U) return HV_CAL_STATUS_FLASH_ERROR;
  if (flash_program_region(s_stage, sizeof(s_stage)) == 0U) return HV_CAL_STATUS_FLASH_ERROR;

  Calibration_Init();   /* re-validate from flash, re-arm pointers */
  return (s_valid != 0U) ? HV_CAL_STATUS_OK : HV_CAL_STATUS_FLASH_ERROR;
}
