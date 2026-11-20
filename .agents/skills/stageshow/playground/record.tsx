// A frame-exact recording route: installs the virtual clock before the
// example loads, so a recorder steps time with window.__stageshow.clock.
import { installVirtualClock } from '../kit/clock'

const params = new URLSearchParams(location.search)
installVirtualClock({ fps: Number(params.get('fps') ?? 30) })
const { mount } = await import('./preview')
await mount(params.get('id')!, false)
;(window as unknown as { __ready: boolean }).__ready = true
