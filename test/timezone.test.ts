/**
 * Timezone Support Tests
 * Tests for the timezone option in Environment
 */

import { describe, test, expect } from 'bun:test'
import { Environment, render } from '../src'

describe('Timezone Support', () => {
  // Use a fixed UTC timestamp: 2024-06-15 12:30:45 UTC (Saturday)
  const utcDate = new Date('2024-06-15T12:30:45Z')

  describe('{% now %} tag with timezone', () => {
    test('should render UTC time correctly', async () => {
      const env = new Environment({ timezone: 'UTC' })
      // We can't test {% now %} directly with fixed date, but we can test date filter
      const result = await env.renderString('{{ date|date:"Y-m-d H:i:s" }}', { date: utcDate })
      expect(result).toBe('2024-06-15 12:30:45')
    })

    test('should render Europe/Rome time correctly (UTC+2 in summer)', async () => {
      const env = new Environment({ timezone: 'Europe/Rome' })
      const result = await env.renderString('{{ date|date:"Y-m-d H:i:s" }}', { date: utcDate })
      // Rome is UTC+2 in summer, so 12:30 UTC = 14:30 Rome
      expect(result).toBe('2024-06-15 14:30:45')
    })

    test('should render America/New_York time correctly (UTC-4 in summer)', async () => {
      const env = new Environment({ timezone: 'America/New_York' })
      const result = await env.renderString('{{ date|date:"Y-m-d H:i:s" }}', { date: utcDate })
      // New York is UTC-4 in summer, so 12:30 UTC = 08:30 NY
      expect(result).toBe('2024-06-15 08:30:45')
    })

    test('should render Asia/Tokyo time correctly (UTC+9)', async () => {
      const env = new Environment({ timezone: 'Asia/Tokyo' })
      const result = await env.renderString('{{ date|date:"Y-m-d H:i:s" }}', { date: utcDate })
      // Tokyo is UTC+9, so 12:30 UTC = 21:30 Tokyo
      expect(result).toBe('2024-06-15 21:30:45')
    })

    test('should render Australia/Sydney time correctly (UTC+10)', async () => {
      const env = new Environment({ timezone: 'Australia/Sydney' })
      const result = await env.renderString('{{ date|date:"Y-m-d H:i:s" }}', { date: utcDate })
      // Sydney is UTC+10 in June (winter), so 12:30 UTC = 22:30 Sydney
      expect(result).toBe('2024-06-15 22:30:45')
    })
  })

  describe('Date filter with different timezones', () => {
    test('should format day name correctly in different timezones', async () => {
      // UTC: Saturday 12:30
      // Tokyo: Saturday 21:30
      const envUtc = new Environment({ timezone: 'UTC' })
      const envTokyo = new Environment({ timezone: 'Asia/Tokyo' })

      const resultUtc = await envUtc.renderString('{{ date|date:"l" }}', { date: utcDate })
      const resultTokyo = await envTokyo.renderString('{{ date|date:"l" }}', { date: utcDate })

      expect(resultUtc).toBe('Saturday')
      expect(resultTokyo).toBe('Saturday')
    })

    test('should handle date crossing midnight', async () => {
      // Date that crosses midnight in some timezones
      // 2024-06-15 23:30:00 UTC = 2024-06-16 01:30:00 Rome
      const lateUtcDate = new Date('2024-06-15T23:30:00Z')

      const envUtc = new Environment({ timezone: 'UTC' })
      const envRome = new Environment({ timezone: 'Europe/Rome' })

      const resultUtc = await envUtc.renderString('{{ date|date:"Y-m-d" }}', { date: lateUtcDate })
      const resultRome = await envRome.renderString('{{ date|date:"Y-m-d" }}', {
        date: lateUtcDate,
      })

      expect(resultUtc).toBe('2024-06-15')
      expect(resultRome).toBe('2024-06-16') // Next day in Rome!
    })

    test('should handle month crossing', async () => {
      // 2024-06-30 23:30:00 UTC = 2024-07-01 01:30:00 Rome
      const endOfMonthUtc = new Date('2024-06-30T23:30:00Z')

      const envUtc = new Environment({ timezone: 'UTC' })
      const envRome = new Environment({ timezone: 'Europe/Rome' })

      const resultUtc = await envUtc.renderString('{{ date|date:"F j" }}', { date: endOfMonthUtc })
      const resultRome = await envRome.renderString('{{ date|date:"F j" }}', {
        date: endOfMonthUtc,
      })

      expect(resultUtc).toBe('June 30')
      expect(resultRome).toBe('July 1') // Next month in Rome!
    })

    test('should handle year crossing', async () => {
      // 2024-12-31 23:30:00 UTC = 2025-01-01 00:30:00 London
      const newYearEve = new Date('2024-12-31T23:30:00Z')

      const envUtc = new Environment({ timezone: 'UTC' })
      const envLondon = new Environment({ timezone: 'Europe/London' })

      const resultUtc = await envUtc.renderString('{{ date|date:"Y" }}', { date: newYearEve })
      const resultLondon = await envLondon.renderString('{{ date|date:"Y" }}', { date: newYearEve })

      expect(resultUtc).toBe('2024')
      expect(resultLondon).toBe('2024') // London is UTC in winter, same year
    })
  })

  describe('Time filter with timezone', () => {
    test('should format time correctly', async () => {
      const envUtc = new Environment({ timezone: 'UTC' })
      const envRome = new Environment({ timezone: 'Europe/Rome' })

      const resultUtc = await envUtc.renderString('{{ date|time:"H:i" }}', { date: utcDate })
      const resultRome = await envRome.renderString('{{ date|time:"H:i" }}', { date: utcDate })

      expect(resultUtc).toBe('12:30')
      expect(resultRome).toBe('14:30')
    })

    test('should format AM/PM correctly', async () => {
      const envUtc = new Environment({ timezone: 'UTC' })
      const envNy = new Environment({ timezone: 'America/New_York' })

      const resultUtc = await envUtc.renderString('{{ date|date:"g:i A" }}', { date: utcDate })
      const resultNy = await envNy.renderString('{{ date|date:"g:i A" }}', { date: utcDate })

      expect(resultUtc).toBe('12:30 PM')
      expect(resultNy).toBe('8:30 AM') // 12:30 UTC = 8:30 AM NY
    })
  })

  describe('All format specifiers with timezone', () => {
    test('should format all date specifiers correctly', async () => {
      const env = new Environment({ timezone: 'Europe/Rome' })
      // 2024-06-15 12:30:45 UTC = 2024-06-15 14:30:45 Rome (Saturday)

      // Day specifiers
      expect(await env.renderString('{{ d|date:"d" }}', { d: utcDate })).toBe('15')
      expect(await env.renderString('{{ d|date:"j" }}', { d: utcDate })).toBe('15')
      expect(await env.renderString('{{ d|date:"D" }}', { d: utcDate })).toBe('Sat')
      expect(await env.renderString('{{ d|date:"l" }}', { d: utcDate })).toBe('Saturday')

      // Month specifiers
      expect(await env.renderString('{{ d|date:"m" }}', { d: utcDate })).toBe('06')
      expect(await env.renderString('{{ d|date:"n" }}', { d: utcDate })).toBe('6')
      expect(await env.renderString('{{ d|date:"M" }}', { d: utcDate })).toBe('Jun')
      expect(await env.renderString('{{ d|date:"F" }}', { d: utcDate })).toBe('June')

      // Year specifiers
      expect(await env.renderString('{{ d|date:"y" }}', { d: utcDate })).toBe('24')
      expect(await env.renderString('{{ d|date:"Y" }}', { d: utcDate })).toBe('2024')

      // Time specifiers (14:30:45 in Rome)
      expect(await env.renderString('{{ d|date:"H" }}', { d: utcDate })).toBe('14')
      expect(await env.renderString('{{ d|date:"G" }}', { d: utcDate })).toBe('14')
      expect(await env.renderString('{{ d|date:"i" }}', { d: utcDate })).toBe('30')
      expect(await env.renderString('{{ d|date:"s" }}', { d: utcDate })).toBe('45')

      // AM/PM
      expect(await env.renderString('{{ d|date:"a" }}', { d: utcDate })).toBe('p.m.')
      expect(await env.renderString('{{ d|date:"A" }}', { d: utcDate })).toBe('PM')

      // 12-hour
      expect(await env.renderString('{{ d|date:"g" }}', { d: utcDate })).toBe('2') // 14:30 = 2:30 PM
      expect(await env.renderString('{{ d|date:"h" }}', { d: utcDate })).toBe('02')
    })
  })

  describe('No timezone (local time)', () => {
    test('should use local timezone when not specified', async () => {
      const env = new Environment() // No timezone
      const result = await env.renderString('{{ date|date:"Y-m-d" }}', { date: utcDate })
      // Should use local timezone, result depends on system
      expect(result).toMatch(/^2024-06-1[45]$/)
    })
  })

  describe('Edge cases', () => {
    test('should handle Pacific timezone with negative offset', async () => {
      // 2024-06-15 05:00:00 UTC = 2024-06-14 22:00:00 LA (previous day!)
      const earlyUtc = new Date('2024-06-15T05:00:00Z')
      const env = new Environment({ timezone: 'America/Los_Angeles' })

      const result = await env.renderString('{{ date|date:"Y-m-d H:i" }}', { date: earlyUtc })
      // LA is UTC-7 in summer, so 05:00 UTC = 22:00 previous day
      expect(result).toBe('2024-06-14 22:00')
    })

    test('should handle string date input', async () => {
      const env = new Environment({ timezone: 'UTC' })
      const result = await env.renderString('{{ date|date:"Y-m-d" }}', {
        date: '2024-06-15T12:30:45Z',
      })
      expect(result).toBe('2024-06-15')
    })

    test('should handle timestamp input', async () => {
      const env = new Environment({ timezone: 'UTC' })
      const timestamp = utcDate.getTime()
      const result = await env.renderString('{{ date|date:"Y-m-d" }}', { date: timestamp })
      expect(result).toBe('2024-06-15')
    })

    test('should return empty string for invalid date', async () => {
      const env = new Environment({ timezone: 'UTC' })
      const result = await env.renderString('{{ date|date:"Y-m-d" }}', { date: 'invalid' })
      expect(result).toBe('')
    })
  })

  describe('Real world scenarios', () => {
    test('should display event time in different timezones', async () => {
      // Event scheduled at 15:00 UTC
      const eventTime = new Date('2024-07-20T15:00:00Z')

      const envLondon = new Environment({ timezone: 'Europe/London' })
      const envRome = new Environment({ timezone: 'Europe/Rome' })
      const envNy = new Environment({ timezone: 'America/New_York' })
      const envTokyo = new Environment({ timezone: 'Asia/Tokyo' })

      const template = '{{ event|date:"l, F j, Y - g:i A" }}'

      const london = await envLondon.renderString(template, { event: eventTime })
      const rome = await envRome.renderString(template, { event: eventTime })
      const ny = await envNy.renderString(template, { event: eventTime })
      const tokyo = await envTokyo.renderString(template, { event: eventTime })

      // July 2024: London UTC+1, Rome UTC+2, NY UTC-4, Tokyo UTC+9
      expect(london).toBe('Saturday, July 20, 2024 - 4:00 PM')
      expect(rome).toBe('Saturday, July 20, 2024 - 5:00 PM')
      expect(ny).toBe('Saturday, July 20, 2024 - 11:00 AM')
      expect(tokyo).toBe('Sunday, July 21, 2024 - 12:00 AM') // Next day in Tokyo!
    })
  })
})
