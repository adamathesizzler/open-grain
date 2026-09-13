// ============================================================
// DYNAMIC ISLAND NAVIGATION — Apple-inspired, fully responsive
// ============================================================

class DynamicIslandNav {
  constructor() {
    this.dock = document.getElementById('dock');
    if (!this.dock) return;
    
    this.isExpanded = false;
    this.isCompact = false; // true = bottom position
    this.scrollThreshold = 80; // px scrolled before triggering compact
    this.lastScrollY = 0;
    this.animating = false;
    
    // Breakpoint for touch vs hover
    this.isTouchDevice = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    this.isReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    this.init();
  }

  init() {
    // Apply initial classes
    this.dock.classList.add('dynamic-island');
    
    // Event listeners
    document.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    this.dock.addEventListener('mouseenter', () => this.expand());
    this.dock.addEventListener('mouseleave', () => this.collapse());
    
    // Touch support
    if (this.isTouchDevice()) {
      this.dock.addEventListener('click', (e) => {
        // Don't expand if clicking a nav link directly
        if (e.target.closest('.dock-btn')) return;
        this.toggleExpand();
      });
    }
    
    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isExpanded) {
        this.collapse();
      }
    });

    // Initial state
    this.updatePosition();
  }

  handleScroll() {
    const scrollY = window.scrollY;
    const scrollDelta = scrollY - this.lastScrollY;
    
    if (Math.abs(scrollDelta) < 5) return; // Debounce small scrolls
    
    // Scrolling down: move to bottom
    if (scrollY > this.scrollThreshold && scrollDelta > 0 && !this.isCompact) {
      this.moveToBottom();
    }
    // Scrolling up or back to top: move to top
    else if (scrollY <= this.scrollThreshold && this.isCompact) {
      this.moveToTop();
    }
    
    this.lastScrollY = scrollY;
  }

  moveToBottom() {
    this.isCompact = true;
    this.collapse();
    
    if (this.isReducedMotion()) {
      this.dock.classList.add('is-bottom');
    } else {
      // Animate to bottom
      this.dock.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), bottom 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      this.dock.classList.add('is-bottom');
    }
  }

  moveToTop() {
    this.isCompact = false;
    
    if (this.isReducedMotion()) {
      this.dock.classList.remove('is-bottom');
    } else {
      this.dock.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), bottom 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      this.dock.classList.remove('is-bottom');
    }
  }

  expand() {
    if (this.isExpanded || this.animating || this.isTouchDevice()) return;
    
    this.isExpanded = true;
    this.animating = true;
    
    if (this.isReducedMotion()) {
      this.dock.classList.add('expanded');
      this.animating = false;
    } else {
      this.dock.style.transition = 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease-out';
      this.dock.classList.add('expanded');
      
      setTimeout(() => {
        this.animating = false;
      }, 400);
    }
  }

  collapse() {
    if (!this.isExpanded || this.animating) return;
    
    this.isExpanded = false;
    this.animating = true;
    
    if (this.isReducedMotion()) {
      this.dock.classList.remove('expanded');
      this.animating = false;
    } else {
      this.dock.style.transition = 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease-out';
      this.dock.classList.remove('expanded');
      
      setTimeout(() => {
        this.animating = false;
      }, 400);
    }
  }

  toggleExpand() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  updatePosition() {
    if (window.scrollY > this.scrollThreshold && !this.isCompact) {
      this.isCompact = true;
      this.dock.classList.add('is-bottom');
    } else if (window.scrollY <= this.scrollThreshold && this.isCompact) {
      this.isCompact = false;
      this.dock.classList.remove('is-bottom');
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new DynamicIslandNav());
} else {
  new DynamicIslandNav();
}
