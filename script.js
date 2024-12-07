// script.js

class CameraApp {
    constructor() {
        // DOM Elements
        this.video = document.getElementById('video');
        this.overlayCanvas = document.getElementById('overlay');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        this.buttons = document.querySelectorAll('button[data-filter]');
        this.overlaySelector = document.getElementById('overlaySelector');
        this.captureBtn = document.getElementById('capture');
        this.downloadBtn = document.getElementById('download');
        this.openGalleryBtn = document.getElementById('openGallery');
        this.gallery = document.getElementById('gallery');
        this.closeGalleryBtn = document.getElementById('closeGallery');
        this.galleryImages = document.getElementById('galleryImages');
        this.customOverlayInput = document.getElementById('customOverlayInput');
        this.loading = document.getElementById('loading');

        // State Variables
        this.overlays = [];
        this.currentFilter = 'none';
        this.capturedImage = null;
        this.animationFrame = null;
        this.dragging = false;
        this.currentOverlay = null;
        this.offset = { x: 0, y: 0 };
        this.initialSize = 150;
        this.initialRotation = 0;

        // Initialize the App
        this.init();
    }

    async init() {
        await this.preloadImages();
        await this.startCamera();
        this.addEventListeners();
        this.initGestures();
        this.drawOverlay();
    }

    // Preload Overlay Images
    async preloadImages() {
        this.overlayImages = {
            glasses: new Image(),
            crown: new Image(),
            // Add other overlays as needed
        };
        this.overlayImages.glasses.src = 'https://i.postimg.cc/Vk5N7mNF/cartoon-glasses.png'; // Replace with your actual image URLs
        this.overlayImages.crown.src = 'https://i.postimg.cc/Yq1wF3p3/flower-crown.png'; // Replace with your actual image URLs

        // Wait for all images to load
        const promises = Object.values(this.overlayImages).map(img => {
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
        });

        await Promise.all(promises);
    }

    // Start Camera
    async startCamera() {
        this.loading.classList.remove('hidden');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            await new Promise(resolve => {
                this.video.onloadedmetadata = () => {
                    resolve();
                };
            });
            this.resizeCanvas();
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access the camera. Please check your device settings.');
        } finally {
            this.loading.classList.add('hidden');
        }
    }

    // Resize Overlay Canvas to Match Video
    resizeCanvas() {
        this.overlayCanvas.width = this.video.videoWidth;
        this.overlayCanvas.height = this.video.videoHeight;
    }

    // Add Event Listeners
    addEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        // Filter Buttons
        this.buttons.forEach(button => {
            button.addEventListener('click', () => {
                this.currentFilter = button.dataset.filter;
                this.video.style.filter = this.currentFilter;
            });
        });

        // Overlay Selection
        this.overlaySelector.addEventListener('change', (event) => {
            const overlayType = event.target.value;
            if (overlayType === 'none') {
                this.overlays = [];
            } else if (overlayType === 'custom') {
                this.customOverlayInput.click();
            } else {
                let imgSrc = null;
                if (overlayType === 'twinkling') {
                    imgSrc = 'twinkling'; // Special case for animated overlays
                } else {
                    imgSrc = this.overlayImages[overlayType];
                }
                this.addOverlay(overlayType, imgSrc);
            }
        });

        // Capture Button
        this.captureBtn.addEventListener('click', () => this.captureImage());

        // Download Button
        this.downloadBtn.addEventListener('click', () => this.downloadImage());

        // Open Gallery Button
        this.openGalleryBtn.addEventListener('click', () => this.openGallery());

        // Close Gallery Button
        this.closeGalleryBtn.addEventListener('click', () => this.closeGallery());

        // Custom Overlay Input
        this.customOverlayInput.addEventListener('change', (event) => this.addCustomOverlay(event));

        // Overlay Drag Events
        this.overlayCanvas.addEventListener('mousedown', (e) => this.startDrag(e));
        this.overlayCanvas.addEventListener('mousemove', (e) => this.drag(e));
        this.overlayCanvas.addEventListener('mouseup', () => this.endDrag());

        // Touch Events for Mobile Devices
        this.overlayCanvas.addEventListener('touchstart', (e) => this.startDrag(e));
        this.overlayCanvas.addEventListener('touchmove', (e) => this.drag(e));
        this.overlayCanvas.addEventListener('touchend', () => this.endDrag());
    }

    // Add Overlay
    addOverlay(type, imgSrc) {
        if (imgSrc === 'twinkling') {
            this.overlays.push({
                type: type,
                img: 'twinkling',
                position: { x: 100, y: 100, size: 150 },
                rotation: 0,
            });
        } else if (imgSrc instanceof Image) {
            this.overlays.push({
                type: type,
                img: imgSrc,
                position: { x: 100, y: 100, size: 150 },
                rotation: 0,
            });
        }
    }

    // Capture Image
    captureImage() {
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = this.video.videoWidth;
        captureCanvas.height = this.video.videoHeight;
        const captureCtx = captureCanvas.getContext('2d');

        // Draw Video Frame
        captureCtx.drawImage(this.video, 0, 0, captureCanvas.width, captureCanvas.height);

        // Draw Overlays
        this.overlays.forEach(overlay => {
            if (overlay.img) {
                if (overlay.img === 'twinkling') {
                    // Optional: Handle animated overlays in captures if needed
                } else {
                    captureCtx.save();
                    captureCtx.translate(overlay.position.x + overlay.position.size / 2, overlay.position.y + overlay.position.size / 2);
                    captureCtx.rotate(overlay.rotation * Math.PI / 180);
                    captureCtx.drawImage(
                        overlay.img,
                        -overlay.position.size / 2,
                        -overlay.position.size / 2,
                        overlay.position.size,
                        overlay.position.size
                    );
                    captureCtx.restore();
                }
            }
        });

        // Generate Image URL
        this.capturedImage = captureCanvas.toDataURL('image/png');

        // Save to Gallery
        this.saveToGallery(this.capturedImage);
    }

    // Download Image
    downloadImage() {
        if (!this.capturedImage) {
            alert('Please capture an image first.');
            return;
        }
        const link = document.createElement('a');
        link.href = this.capturedImage;
        link.download = 'capture.png';
        link.click();
    }

    // Save Image to Gallery (Local Storage)
    saveToGallery(imageSrc) {
        let images = JSON.parse(localStorage.getItem('capturedImages')) || [];
        images.push(imageSrc);
        localStorage.setItem('capturedImages', JSON.stringify(images));
    }

    // Open Gallery
    openGallery() {
        this.gallery.classList.remove('hidden');
        this.loadGallery();
    }

    // Close Gallery
    closeGallery() {
        this.gallery.classList.add('hidden');
    }

    // Load Gallery Images
    loadGallery() {
        this.galleryImages.innerHTML = '';
        const images = JSON.parse(localStorage.getItem('capturedImages')) || [];
        images.forEach((imgSrc, index) => {
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = `Capture ${index + 1}`;
            img.addEventListener('click', () => {
                const viewer = window.open(imgSrc, '_blank');
                viewer.focus();
            });
            this.galleryImages.appendChild(img);
        });
    }

    // Add Custom Overlay
    addCustomOverlay(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    this.overlays.push({
                        type: 'custom',
                        img: img,
                        position: { x: 100, y: 100, size: 150 },
                        rotation: 0,
                    });
                };
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload a valid image file.');
        }
    }

    // Start Dragging Overlay
    startDrag(e) {
        e.preventDefault();
        const { x, y } = this.getPointerPosition(e);
        // Iterate overlays in reverse to select topmost
        for (let i = this.overlays.length - 1; i >= 0; i--) {
            const overlay = this.overlays[i];
            if (
                x > overlay.position.x &&
                x < overlay.position.x + overlay.position.size &&
                y > overlay.position.y &&
                y < overlay.position.y + overlay.position.size
            ) {
                this.dragging = true;
                this.currentOverlay = overlay;
                this.offset.x = x - overlay.position.x;
                this.offset.y = y - overlay.position.y;
                // Bring the dragged overlay to the top
                this.overlays.push(this.overlays.splice(i, 1)[0]);
                break;
            }
        }
    }

    // Drag Overlay
    drag(e) {
        if (this.dragging && this.currentOverlay) {
            const { x, y } = this.getPointerPosition(e);
            this.currentOverlay.position.x = x - this.offset.x;
            this.currentOverlay.position.y = y - this.offset.y;
        }
    }

    // End Dragging
    endDrag() {
        this.dragging = false;
        this.currentOverlay = null;
    }

    // Get Pointer Position (Mouse or Touch)
    getPointerPosition(e) {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const rect = this.overlayCanvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return { x, y };
    }

    // Initialize Touch Gestures Using Hammer.js
    initGestures() {
        const hammer = new Hammer(this.overlayCanvas);

        // Enable Pinch and Rotate
        hammer.get('pinch').set({ enable: true });
        hammer.get('rotate').set({ enable: true });

        hammer.on('pinchmove', (e) => {
            if (this.currentOverlay) {
                this.currentOverlay.position.size = this.initialSize * e.scale;
            }
        });

        hammer.on('rotatemove', (e) => {
            if (this.currentOverlay) {
                this.currentOverlay.rotation = this.initialRotation + e.rotation;
            }
        });

        hammer.on('pinchend rotatemend', () => {
            if (this.currentOverlay) {
                this.initialSize = this.currentOverlay.position.size;
                this.initialRotation = this.currentOverlay.rotation;
            }
        });
    }

    // Draw Overlays on Canvas
    drawOverlay() {
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        this.overlays.forEach(overlay => {
            if (overlay.img) {
                if (overlay.img === 'twinkling') {
                    // Twinkling Stars Animation
                    for (let i = 0; i < 50; i++) {
                        const x = Math.random() * this.overlayCanvas.width;
                        const y = Math.random() * this.overlayCanvas.height;
                        const size = Math.random() * 3;
                        this.overlayCtx.fillStyle = `rgba(255, 255, 255, ${Math.random()})`;
                        this.overlayCtx.beginPath();
                        this.overlayCtx.arc(x, y, size, 0, Math.PI * 2);
                        this.overlayCtx.fill();
                    }
                } else {
                    this.overlayCtx.save();
                    this.overlayCtx.translate(overlay.position.x + overlay.position.size / 2, overlay.position.y + overlay.position.size / 2);
                    this.overlayCtx.rotate(overlay.rotation * Math.PI / 180);
                    this.overlayCtx.drawImage(
                        overlay.img,
                        -overlay.position.size / 2,
                        -overlay.position.size / 2,
                        overlay.position.size,
                        overlay.position.size
                    );
                    this.overlayCtx.restore();
                }
            }
        });

        this.animationFrame = requestAnimationFrame(() => this.drawOverlay());
    }
}

// Initialize the Camera App when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new CameraApp();
});