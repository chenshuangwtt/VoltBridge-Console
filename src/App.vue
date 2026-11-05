<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
const nav=[['Dashboard','/'],['Devices','/devices'],['Transactions','/transactions'],['Billing','/billing'],['Tariffs','/tariffs']]
const health=useQuery({queryKey:['health'],queryFn:async()=>{const r=await fetch('/actuator/health');return r.ok?'UP':'DOWN'},retry:false})
</script>
<template><div class="shell"><aside><div class="brand"><span class="logo">V</span><div><b>VoltBridge</b><small>OPERATIONS CONSOLE</small></div></div><nav><RouterLink v-for="n in nav" :key="n[1]" :to="n[1]">{{n[0]}}</RouterLink></nav><div class="side-foot">LIGHTWEIGHT OPERATIONS<br>VoltBridge API · v0.1</div></aside><main><header><div><span class="eyebrow">VOLTBRIDGE / OPERATIONS</span><h1>Operations Console</h1></div><span class="health"><i :class="health.data.value==='UP'?'up':''"></i> Backend {{health.data.value||'UNKNOWN'}}</span></header><RouterView/><footer>VoltBridge Console · Data shown is returned by the backend</footer></main></div></template>
