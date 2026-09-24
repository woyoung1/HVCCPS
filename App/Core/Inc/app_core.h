/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file    app_core.h
  * @brief   Application control, telemetry and serial protocol glue.
  ******************************************************************************
  */
/* USER CODE END Header */

#ifndef __APP_CORE_H__
#define __APP_CORE_H__

#ifdef __cplusplus
extern "C" {
#endif

#include "main.h"

void APP_Init(void);
void APP_Task(void);
void APP_HRTIM_ControlISR(void);
void APP_HRTIM_IsrTimingEnd(uint32_t start_cycles);
void APP_TIM7_FrequencyControlISR(void);

#ifdef __cplusplus
}
#endif

#endif /* __APP_CORE_H__ */
