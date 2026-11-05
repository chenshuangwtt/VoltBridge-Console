import { describe, expect, it } from 'vitest'
import { isTariffFormValid } from './tariff-form'
const valid = { tenantId:'tenant', name:'Standard', currency:'CNY', effectiveFrom:'2026-01-01T00:00:00Z', energyPricePerKwh:1, serviceFeePerKwh:0.2 }
describe('tariff form validation',()=>{
 it('accepts a valid fixed-rate tariff',()=>expect(isTariffFormValid(valid,'tenant')).toBe(true))
 it('requires tenant context, name, currency and nonnegative rates',()=>{
  expect(isTariffFormValid(valid,'')).toBe(false)
  expect(isTariffFormValid({...valid,name:''},'tenant')).toBe(false)
  expect(isTariffFormValid({...valid,energyPricePerKwh:-1},'tenant')).toBe(false)
 })
})
