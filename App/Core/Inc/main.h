/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.h
  * @brief          : Header for main.c file.
  *                   This file contains the common defines of the application.
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef __MAIN_H
#define __MAIN_H

#ifdef __cplusplus
extern "C" {
#endif

/* Includes ------------------------------------------------------------------*/
#include "stm32g4xx_hal.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */

/* USER CODE END Includes */

/* Exported types ------------------------------------------------------------*/
/* USER CODE BEGIN ET */

/* USER CODE END ET */

/* Exported constants --------------------------------------------------------*/
/* USER CODE BEGIN EC */

/* USER CODE END EC */

/* Exported macro ------------------------------------------------------------*/
/* USER CODE BEGIN EM */

/* USER CODE END EM */

/* Exported functions prototypes ---------------------------------------------*/
void Error_Handler(void);

/* USER CODE BEGIN EFP */

/* USER CODE END EFP */

/* Private defines -----------------------------------------------------------*/
#define HRTIM_PRD 15111
#define DEAD_TIME 34
#define LED_C_Pin GPIO_PIN_13
#define LED_C_GPIO_Port GPIOC
#define I_PRI_DC_ADC_Pin GPIO_PIN_0
#define I_PRI_DC_ADC_GPIO_Port GPIOA
#define I_PRI_AC_ADC_Pin GPIO_PIN_1
#define I_PRI_AC_ADC_GPIO_Port GPIOA
#define V_PRI_DC_ADC_Pin GPIO_PIN_2
#define V_PRI_DC_ADC_GPIO_Port GPIOA
#define V_SEC_DC_ADC_Pin GPIO_PIN_3
#define V_SEC_DC_ADC_GPIO_Port GPIOA
#define I_SEC_DC_ADC_Pin GPIO_PIN_6
#define I_SEC_DC_ADC_GPIO_Port GPIOA
#define KEY_B_Pin GPIO_PIN_7
#define KEY_B_GPIO_Port GPIOA
#define KEY_A_Pin GPIO_PIN_0
#define KEY_A_GPIO_Port GPIOB
#define LED_A_Pin GPIO_PIN_12
#define LED_A_GPIO_Port GPIOB
#define AUX_12V_ADC_Pin GPIO_PIN_13
#define AUX_12V_ADC_GPIO_Port GPIOB
#define AUX_5V_ADC_Pin GPIO_PIN_14
#define AUX_5V_ADC_GPIO_Port GPIOB
#define TEMP_ADC_Pin GPIO_PIN_15
#define TEMP_ADC_GPIO_Port GPIOB
#define LED_B_Pin GPIO_PIN_12
#define LED_B_GPIO_Port GPIOA

/* USER CODE BEGIN Private defines */

/* USER CODE END Private defines */

#ifdef __cplusplus
}
#endif

#endif /* __MAIN_H */
