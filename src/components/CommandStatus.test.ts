// @vitest-environment jsdom
import {mount,flushPromises} from '@vue/test-utils'
import {QueryClient,VueQueryPlugin} from '@tanstack/vue-query'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import CommandStatus from './CommandStatus.vue'
import {api} from '../api/client'
vi.mock('../api/client',()=>({api:{GET:vi.fn()},unwrap:async(r:any)=>r.data}))
const view=(status:string)=>({commandId:'cmd-1',deviceCode:'D-1',type:'START_CHARGING',status,createdAt:'2026-01-01T00:00:00Z',failureCode:status==='FAILED'?'DEVICE_ERROR':undefined,failureReason:status==='FAILED'?'Device rejected command':undefined})
describe('CommandStatus',()=>{
 beforeEach(()=>vi.mocked(api.GET).mockReset())
 async function mountState(status:string){vi.mocked(api.GET).mockResolvedValue({data:view(status)} as any);const wrapper=mount(CommandStatus,{props:{commandId:'cmd-1'},global:{plugins:[[VueQueryPlugin,{queryClient:new QueryClient({defaultOptions:{queries:{retry:false}}})}]]}});await flushPromises();return wrapper}
 it('does not call ACKED a business success',async()=>{const w=await mountState('ACKED');expect(w.text()).toContain('Acknowledged by charger');expect(w.text()).not.toContain('Command succeeded')})
 it('shows success only at SUCCEEDED',async()=>{const w=await mountState('SUCCEEDED');expect(w.text()).toContain('Command succeeded')})
 it('shows failure reason and code',async()=>{const w=await mountState('FAILED');expect(w.text()).toContain('DEVICE_ERROR');expect(w.text()).toContain('Device rejected command')})
})
