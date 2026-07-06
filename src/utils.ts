/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 判断是否为工作日（工厂工作日跳过周日）
 */
export function isFactoryWorkday(date: Date): boolean {
  const day = date.getDay();
  // 0 是周日，工厂通常在周日休息。跳过周日
  if (day === 0) {
    return false;
  }
  
  // 法定节假日仿真
  const formattedDate = date.toISOString().split('T')[0];
  const holidays = [
    '2026-01-01', // 元旦
    '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', // 春节仿真
    '2026-05-01', // 劳动节
    '2026-10-01', '2026-10-02', '2026-10-03', // 国庆节
  ];
  if (holidays.includes(formattedDate)) {
    return false;
  }
  
  return true;
}

/**
 * 计算 T0 加上 X 个工厂工作日后的日期
 */
export function addFactoryWorkdays(startDateStr: string, workdays: number): string {
  let currentDate = new Date(startDateStr);
  let addedDays = 0;
  
  while (addedDays < workdays) {
    // 增加一天
    currentDate.setDate(currentDate.getDate() + 1);
    if (isFactoryWorkday(currentDate)) {
      addedDays++;
    }
  }
  
  return currentDate.toISOString().split('T')[0];
}

/**
 * 计算两个日期之间的工厂工作日天数
 */
export function getFactoryWorkdaysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (start > end) return 0;
  
  let workdays = 0;
  let current = new Date(start);
  
  while (current <= end) {
    if (isFactoryWorkday(current)) {
      workdays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workdays;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 获得当前日期
 */
export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}
