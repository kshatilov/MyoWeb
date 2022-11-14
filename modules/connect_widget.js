const services = {
    controlService: {
        name: 'control service',
        uuid: 'd5060001-a904-deb9-4748-2c7f4a124842'
    },
    imuDataService: {
        name: 'IMU Data Service',
        uuid: 'd5060002-a904-deb9-4748-2c7f4a124842'
    },
    emgDataService: {
        name: 'EMG Data Service',
        uuid: 'd5060005-a904-deb9-4748-2c7f4a124842'
    },
    batteryService: {
        name: 'battery service',
        uuid: 0x180f
    },
    classifierService: {
        name: 'classifier service',
        uuid: 'd5060003-a904-deb9-4748-2c7f4a124842'
    }
}

const characteristics = {
    commandCharacteristic: {
        name: 'command characteristic',
        uuid: 'd5060401-a904-deb9-4748-2c7f4a124842'
    },
    imuDataCharacteristic: {
        name: 'imu data characteristic',
        uuid: 'd5060402-a904-deb9-4748-2c7f4a124842'
    },
    batteryLevelCharacteristic: {
        name: 'battery level characteristic',
        uuid: 0x2a19
    },
    classifierEventCharacteristic: {
        name: 'classifier event characteristic',
        uuid: 'd5060103-a904-deb9-4748-2c7f4a124842'
    },
    emgData0Characteristic: {
        name: 'EMG Data 0 characteristic',
        uuid: 'd5060105-a904-deb9-4748-2c7f4a124842'
    }
}

let diode = null; 
let statusLabel = null;
let connectButton = null;

init = () => {
    window.onload = () => {
        let widgetBody = document.createElement("div")
        widgetBody.style.marginLeft = "20px";
        widgetBody.style.marginTop = "20px";
        widgetBody.style.borderRadius  = "10px";
        widgetBody.style.border =  "2px solid gray";
        widgetBody.style.padding =  "10px";
        widgetBody.style.width =  "375px";

        connectButton = document.createElement("button")
        connectButton.innerHTML = "connect";
        connectButton.onclick = connect;
        connectButton.style.float = "right"
        connectButton.style.marginLeft = "20px"
        connectButton.style.backgroundColor =  "white";
        connectButton.style.borderRadius =  "6px";
        connectButton.style.height =  "20px";
        connectButton.style.border =  "2px solid gray";
        connectButton.style.display = "inline-block";
        connectButton.style.marginLeft = "20px"

        diode = document.createElement("span");
        diode.style.height =  "10px";
        diode.style.width =  "10px";
        diode.style.backgroundColor =  "gray";
        diode.style.borderRadius =  "50%";
        diode.style.display = "inline-block";
        diode.style.marginLeft = "20px"

        statusLabel = document.createElement("span");
        statusLabel.style.marginLeft = "20px"
        statusLabel.style.textAlign = "center"
        statusLabel.innerHTML = "OFFLINE";
        

        widgetBody.appendChild(diode);
        widgetBody.appendChild(statusLabel);
        widgetBody.appendChild(connectButton);
        document.getElementById("widget_container").appendChild(widgetBody);
    }
}

init()
let server = null;

connect = () => {
    return navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
            services.imuDataService.uuid,
            services.batteryService.uuid,
            services.imuDataService.uuid,
            services.controlService.uuid,
            services.emgDataService.uuid,
            services.classifierService.uuid
        ]
    })
    .then(device => {
        return device.gatt.connect()
    })
    .then(server => {

        // enable  streaming
        server.getPrimaryService(services.controlService.uuid)
        .then(service => {
            return service.getCharacteristic(characteristics.commandCharacteristic.uuid);
        })
        .then(characteristic => {
            let commandValue = new Uint8Array([0x01, 3, 0x02, 0x03, 0x01]);
            characteristic.writeValue(commandValue);
        })

        connectButton.style.display = "none";
        statusLabel.innerHTML = "CONNECTING";

        // route IMU & EMG streaming
        let config = [
            {
                uuid: services.imuDataService.uuid, 
                char: characteristics.imuDataCharacteristic.uuid,
                handler: handleIMU
            },
            {
                uuid: services.emgDataService.uuid, 
                char: characteristics.emgData0Characteristic.uuid,
                handler: handleEMG
            }
        ]
        config.forEach(e => {
            server.getPrimaryService(e.uuid)
            .then(service => {
                return service.getCharacteristic(e.char);
            })
            .then(characteristics => {
                characteristics.startNotifications().then(res => {
                    characteristics.addEventListener('characteristicvaluechanged', e.handler);
                })
                statusLabel.innerHTML = "STREAMING";
                diode.style.backgroundColor =  "green";
            })
        });
    })

    
    
}

handleEMG = (event) => {
    let emgData = event.target.value;

    let sample2 = [
        emgData.getInt8(8),
        emgData.getInt8(9),
        emgData.getInt8(10),
        emgData.getInt8(11),
        emgData.getInt8(12),
        emgData.getInt8(13),
        emgData.getInt8(14),
        emgData.getInt8(15)
    ]

    console.log("EMG: " + sample2);
}

handleIMU = (event) => {
    let imuData = event.target.value;

    let orientationW = event.target.value.getInt16(0) / 16384;
    let orientationX = event.target.value.getInt16(2) / 16384;
    let orientationY = event.target.value.getInt16(4) / 16384;
    let orientationZ = event.target.value.getInt16(6) / 16384;

    let accelerometerX = event.target.value.getInt16(8) / 2048;
    let accelerometerY = event.target.value.getInt16(10) / 2048;
    let accelerometerZ = event.target.value.getInt16(12) / 2048;

    let gyroscopeX = event.target.value.getInt16(14) / 16;
    let gyroscopeY = event.target.value.getInt16(16) / 16;
    let gyroscopeZ = event.target.value.getInt16(18) / 16;

    var data = {
        orientation: {
            x: orientationX,
            y: orientationY,
            z: orientationZ,
            w: orientationW
        },
        accelerometer: {
            x: accelerometerX,
            y: accelerometerY,
            z: accelerometerZ
        },
        gyroscope: {
            x: gyroscopeX,
            y: gyroscopeY,
            z: gyroscopeZ
        }
    }

    console.log("IMU" + data.orientation.x);
}

