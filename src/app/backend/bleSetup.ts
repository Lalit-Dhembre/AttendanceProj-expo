// bleService.ts
import { PermissionsAndroid, Alert, Platform } from "react-native";
import { NativeEventEmitter, NativeModules } from "react-native";
import { advertiseStart, advertiseStop, scanStart, scanStop } from "react-native-ble-phone-to-phone";

interface BLEListeners {
  foundUuid?: ReturnType<typeof NativeEventEmitter.prototype.addListener>;
  foundDevice?: ReturnType<typeof NativeEventEmitter.prototype.addListener>;
  error?: ReturnType<typeof NativeEventEmitter.prototype.addListener>;
  log?: ReturnType<typeof NativeEventEmitter.prototype.addListener>;
}

interface BLEAPI {
  requestPermissions(): Promise<boolean>;
  startScanning(uuids: string | string[]): void;
  stopScanning(): void;
  startAdvertising(uuid: string): void;
  stopAdvertising(): void;
  cleanup(): void;
}

export default function bleService(): BLEAPI {
  let eventEmitter: NativeEventEmitter;
  let listeners: BLEListeners = {};

  const PERMISSIONS = {
    android: [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      console.warn('Permissions only implemented for Android');
      return true;
    }

    try {
      const results = await Promise.all(
        PERMISSIONS.android.map(permission =>
          PermissionsAndroid.request(permission, {
            title: "Bluetooth Permissions",
            message: "This app requires Bluetooth permissions to function properly",
            buttonPositive: "OK",
          })
        )
      );

      return results.every(result => result === PermissionsAndroid.RESULTS.GRANTED);
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const setupEventListeners = () => {
    if (!eventEmitter) {
      eventEmitter = new NativeEventEmitter(NativeModules.BLEAdvertiser);
    }

    // Remove existing listeners before adding new ones
    cleanup();

    listeners = {
      foundUuid: eventEmitter.addListener("foundUuid", (data) => {
        console.log("Found UUID:", data);
        Alert.alert(
          "Attendance Marked",
          "Your attendance has been recorded successfully!",
          [{ text: "OK" }]
        );
      }),

      foundDevice: eventEmitter.addListener("foundDevice", (data) => {
        console.log("Found Device:", data);
      }),

      error: eventEmitter.addListener("error", (error) => {
        console.error("BLE Error:", error);
        Alert.alert(
          "Bluetooth Error",
          "There was an error with the Bluetooth connection. Please try again.",
          [{ text: "OK" }]
        );
      }),

      log: eventEmitter.addListener("log", (log) => {
        console.log("BLE Log:", log);
      })
    };
  };

  const startScanning = (uuids: string | string[]): void => {
    setupEventListeners();
    const uuidString = Array.isArray(uuids) ? uuids.join(',') : uuids;
    console.log('Starting scan for UUIDs:', uuidString);
    scanStart(uuidString);
  };

  const stopScanning = (): void => {
    console.log('Stopping scan');
    scanStop();
  };

  const startAdvertising = async (uuid: string): void => {
    try {
      console.log('Starting advertisement with UUID:', uuid);
      await advertiseStart(uuid);
    } catch (error) {
      console.error('Error starting advertisement:', error);
      Alert.alert(
        "Error",
        "Failed to start Bluetooth advertising. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const stopAdvertising = async (): void => {
    try {
      console.log('Stopping advertisement');
      await advertiseStop();
    } catch (error) {
      console.error('Error stopping advertisement:', error);
    }
  };

  const cleanup = (): void => {
    Object.values(listeners).forEach(listener => {
      listener?.remove();
    });
    listeners = {};
  };

  return {
    requestPermissions,
    startScanning,
    stopScanning,
    startAdvertising,
    stopAdvertising,
    cleanup,
  };
}