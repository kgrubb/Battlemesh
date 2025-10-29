/**
 * Meshtastic Bluetooth integration using Web Bluetooth API
 */

import { ref, onUnmounted } from 'vue'
import { useEventEmitter } from './useEventEmitter.mjs'

const MESHTASTIC_SERVICE_UUID = '6ba1b218-15a8-461f-9fa8-5dcae273eafd'
const MESHTASTIC_CHARACTERISTIC_UUID = '8ba2bcc2-ee02-4a55-a531-c525c5e454d5'

export function useMeshtastic() {
  const device = ref(null)
  const characteristic = ref(null)
  const connected = ref(false)
  const { on, off, emit } = useEventEmitter()
  
  const connect = async () => {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API not supported')
      }
      
      console.log('[Meshtastic] Requesting device...')
      
      device.value = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MESHTASTIC_SERVICE_UUID] }],
        optionalServices: [MESHTASTIC_SERVICE_UUID]
      })
      
      console.log('[Meshtastic] Connecting to GATT server...')
      const server = await device.value.gatt.connect()
      
      console.log('[Meshtastic] Getting service...')
      const service = await server.getPrimaryService(MESHTASTIC_SERVICE_UUID)
      
      console.log('[Meshtastic] Getting characteristic...')
      characteristic.value = await service.getCharacteristic(MESHTASTIC_CHARACTERISTIC_UUID)
      
      // Start notifications
      await characteristic.value.startNotifications()
      characteristic.value.addEventListener('characteristicvaluechanged', handleNotification)
      
      device.value.addEventListener('gattserverdisconnected', handleDisconnect)
      
      connected.value = true
      emit('connected')
      
      console.log('[Meshtastic] Connected successfully')
    } catch (err) {
      console.error('[Meshtastic] Connection failed:', err)
      connected.value = false
      emit('error', err)
      throw err
    }
  }
  
  const disconnect = async () => {
    if (characteristic.value) {
      try {
        await characteristic.value.stopNotifications()
        characteristic.value.removeEventListener('characteristicvaluechanged', handleNotification)
      } catch (err) {
        console.error('[Meshtastic] Error stopping notifications:', err)
      }
    }
    
    if (device.value && device.value.gatt.connected) {
      device.value.gatt.disconnect()
    }
    
    device.value = null
    characteristic.value = null
    connected.value = false
    emit('disconnected')
  }
  
  const send = async (message) => {
    if (!connected.value || !characteristic.value) {
      console.warn('[Meshtastic] Not connected, cannot send message')
      return false
    }
    
    try {
      // Encode message as JSON then to binary
      const jsonStr = JSON.stringify(message)
      const encoder = new TextEncoder()
      const data = encoder.encode(jsonStr)
      
      // Fragment large messages if needed (BLE has ~512 byte limit)
      const MAX_CHUNK_SIZE = 512
      for (let i = 0; i < data.length; i += MAX_CHUNK_SIZE) {
        const chunk = data.slice(i, i + MAX_CHUNK_SIZE)
        await characteristic.value.writeValue(chunk)
      }
      
      return true
    } catch (err) {
      console.error('[Meshtastic] Error sending message:', err)
      emit('error', err)
      return false
    }
  }
  
  const handleNotification = (event) => {
    try {
      const value = event.target.value
      const decoder = new TextDecoder()
      const text = decoder.decode(value)
      const message = JSON.parse(text)
      
      emit('message', message)
    } catch (err) {
      console.error('[Meshtastic] Error parsing notification:', err)
    }
  }
  
  const handleDisconnect = () => {
    console.log('[Meshtastic] Device disconnected')
    connected.value = false
    emit('disconnected')
  }
  
  
  const isSupported = () => {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth
  }
  
  onUnmounted(() => {
    disconnect()
  })
  
  return {
    connected,
    connect,
    disconnect,
    send,
    on,
    off,
    isSupported
  }
}

