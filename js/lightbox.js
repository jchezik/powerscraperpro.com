/* ===== POWER SCRAPER PRO LIGHTBOX ===== */

class PSPLightbox {
  constructor() {
    this.lightboxElement = null;
    this.currentImage = null;
    this.isOpen = false;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.swipeThreshold = 50;
    this.swipeTimeThreshold = 300;
    
    this.init();
  }
  
  init() {
    // Create lightbox HTML structure
    this.createLightboxMarkup();
    
    // Find all showcase images and make them clickable
    this.initShowcaseImages();
    
    // Bind event listeners
    this.bindEvents();
  }
  
  createLightboxMarkup() {
    const lightbox = document.createElement('div');
    lightbox.className = 'psp-lightbox';
    lightbox.innerHTML = `
      <div class="psp-lightbox__content">
        <img class="psp-lightbox__image" src="" alt="" />
      </div>
    `;
    
    document.body.appendChild(lightbox);
    this.lightboxElement = lightbox;
  }
  
  initShowcaseImages() {
    // Find all images in the showcase section
    const showcaseImages = document.querySelectorAll('.showcase__image img');
    
    showcaseImages.forEach(img => {
      // Make image clickable
      img.style.cursor = 'pointer';
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Expand screenshot');
      
      // Add click event
      img.addEventListener('click', (e) => {
        e.preventDefault();
        this.openLightbox(img);
      });
      
      // Add keyboard support
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openLightbox(img);
        }
      });
    });
  }
  
  bindEvents() {
    // Close on backdrop click
    this.lightboxElement.addEventListener('click', (e) => {
      if (e.target === this.lightboxElement) {
        this.closeLightbox();
      }
    });
    
    // Prevent content click from closing
    const content = this.lightboxElement.querySelector('.psp-lightbox__content');
    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.closeLightbox();
      }
    });
    
    // Touch events for mobile swipe
    this.lightboxElement.addEventListener('touchstart', (e) => {
      this.touchStartY = e.touches[0].clientY;
      this.touchStartTime = Date.now();
    }, { passive: true });
    
    this.lightboxElement.addEventListener('touchend', (e) => {
      if (!this.isOpen) return;
      
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      const deltaY = touchEndY - this.touchStartY;
      const deltaTime = touchEndTime - this.touchStartTime;
      
      // Check for swipe down gesture
      if (deltaY > this.swipeThreshold && deltaTime < this.swipeTimeThreshold) {
        this.closeLightbox();
      }
    }, { passive: true });
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      if (this.isOpen) {
        // Small delay to let orientation change complete
        setTimeout(() => {
          this.adjustImageSize();
        }, 100);
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.adjustImageSize();
      }
    });
  }
  
  openLightbox(imgElement) {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.currentImage = imgElement;
    
    // Get the high-res version of the image
    const imgSrc = this.getHighResImage(imgElement);
    const imgAlt = imgElement.getAttribute('alt') || '';
    
    // Set image in lightbox
    const lightboxImg = this.lightboxElement.querySelector('.psp-lightbox__image');
    lightboxImg.src = imgSrc;
    lightboxImg.alt = imgAlt;
    
    // Prevent body scroll
    document.body.classList.add('psp-lightbox-open');
    
    // Show lightbox with animation
    this.lightboxElement.classList.add('is-active');
    
    // Focus trap for accessibility
    this.lightboxElement.setAttribute('aria-hidden', 'false');
    lightboxImg.focus();
    
    // Load image if not already loaded
    if (!lightboxImg.complete) {
      lightboxImg.addEventListener('load', () => {
        this.adjustImageSize();
      }, { once: true });
    } else {
      this.adjustImageSize();
    }
  }
  
  closeLightbox() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    
    // Hide lightbox
    this.lightboxElement.classList.remove('is-active');
    
    // Restore body scroll
    document.body.classList.remove('psp-lightbox-open');
    
    // Clear aria-hidden
    this.lightboxElement.setAttribute('aria-hidden', 'true');
    
    // Return focus to original image
    if (this.currentImage) {
      this.currentImage.focus();
    }
    
    // Clear current image reference after animation
    setTimeout(() => {
      this.currentImage = null;
    }, 200);
  }
  
  getHighResImage(imgElement) {
    // Check if there's a picture element parent with WebP source
    const pictureParent = imgElement.closest('picture');
    if (pictureParent) {
      const webpSource = pictureParent.querySelector('source[type="image/webp"]');
      if (webpSource && webpSource.srcset) {
        return webpSource.srcset;
      }
    }
    
    // Fallback to img src
    return imgElement.src;
  }
  
  adjustImageSize() {
    const lightboxImg = this.lightboxElement.querySelector('.psp-lightbox__image');
    
    // Let CSS handle responsive sizing, but ensure image is visible
    if (lightboxImg.complete && lightboxImg.naturalHeight !== 0) {
      lightboxImg.style.display = 'block';
    }
  }
}

// Initialize lightbox when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PSPLightbox();
  });
} else {
  new PSPLightbox();
}

// Export for potential external use
window.PSPLightbox = PSPLightbox;