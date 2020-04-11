const cam = document.getElementById('cam')
const boxSelectDevice = document.getElementById('box-select-device')
const selectDevice = document.getElementById('selectDevice')

selectDevice.addEventListener('change', event => {
    boxSelectDevice.style.display = 'none'
    cam.style.display = 'block'

    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/assets/lib/face-api/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/assets/lib/face-api/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/assets/lib/face-api/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/assets/lib/face-api/models'),
        faceapi.nets.ageGenderNet.loadFromUri('/assets/lib/face-api/models'),
        faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/lib/face-api/models'),
    ]).then(startVideo)
})

const fillSelectDevice = () => {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            if (Array.isArray(devices)) {
                devices.forEach((device, i) => {
                    if (device.kind === 'videoinput') {
                        const option = document.createElement('option')
                        option.value = device.deviceId
                        option.text = device.label
                        
                        selectDevice.add(option)
                    }
                })

                if (selectDevice.options.length == 2) {
                    selectDevice.options[1].selected = 'selected'
                    const evt = document.createEvent('HTMLEvents')
                    evt.initEvent('change', false, true)
                    selectDevice.dispatchEvent(evt)
                } else {
                    boxSelectDevice.style.display = 'block'
                }
            }
        })
}

fillSelectDevice()

const startVideo = () => {
    console.log(selectDevice.selectedIndex, selectDevice.options[selectDevice.selectedIndex].value)
    navigator.getUserMedia(
            { video: {
                deviceId: selectDevice.options[selectDevice.selectedIndex].value
            }},
            stream => {
                
                return cam.srcObject = stream
            },
            error => console.error(error)
        )
}

const loadLabels = () => {
    const labels = ['Pedro Schneider']
    return Promise.all(labels.map(async label => {
        const descriptions = []
        for (let i = 1; i <= 5; i++) {
            const img = await faceapi.fetchImage(`/assets/lib/face-api/labels/${label}/${i}.jpg`)
            const detections = await faceapi
                .detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor()
            descriptions.push(detections.descriptor)
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions)
    }))
}

cam.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(cam)
    const canvasSize = {
        width: cam.width,
        height: cam.height
    }
    const labels = await loadLabels()
    faceapi.matchDimensions(canvas, canvasSize)
    document.body.appendChild(canvas)
    setInterval(async () => {
        const detections = await faceapi
            .detectAllFaces(
                cam,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceDescriptors()
        const resizedDetections = faceapi.resizeResults(detections, canvasSize)
        const faceMatcher = new faceapi.FaceMatcher(labels, 0.6)
        const results = resizedDetections.map(d =>
            faceMatcher.findBestMatch(d.descriptor)
        )
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        faceapi.draw.drawDetections(canvas, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        results.forEach((result, index) => {
            const box = resizedDetections[index].detection.box
            const { label, distance } = result
            new faceapi.draw.DrawTextField([
                `${label} (${parseInt(distance * 100, 10)})`
            ], box.bottomRight).draw(canvas)
        })
    }, 100)
})
