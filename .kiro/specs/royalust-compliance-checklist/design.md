# Design Document

## Overview

The Royalust Compliance Checklist website is an interactive dashboard that transforms regulatory compliance data into a visually engaging, trackable interface. The system uses a modular architecture with separate components for data management, UI rendering, and user interactions. The design emphasizes visual hierarchy through a dark theme with violet highlights, progressive disclosure of information, and real-time progress tracking.

## Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Header    │  │  Progress   │  │  Category   │        │
│  │ Component   │  │  Component  │  │ Components  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   State     │  │  Animation  │  │   Export    │        │
│  │ Management  │  │   Engine    │  │   System    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Compliance  │  │   Theme     │  │   Storage   │        │
│  │    Data     │  │   System    │  │   Layer     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### File Structure
```
royalust-compliance/
├── index.html                 # Main application entry
├── assets/
│   ├── css/
│   │   ├── theme.css         # Color scheme and variables
│   │   ├── components.css    # Component-specific styles
│   │   └── animations.css    # Animation definitions
│   ├── js/
│   │   ├── app.js           # Main application logic
│   │   ├── data.js          # Compliance data management
│   │   ├── components.js    # UI component definitions
│   │   └── utils.js         # Utility functions
│   └── images/
│       └── icons/           # SVG icons and graphics
├── components/
│   ├── header.html          # Header component template
│   ├── progress-ring.html   # Progress indicator template
│   └── category-card.html   # Category card template
├── data/
│   └── compliance.json      # Structured compliance data
├── vercel.json              # Vercel deployment config
└── package.json             # Project dependencies
```

## Components and Interfaces

### Core Components

#### 1. Application Shell (app.js)
- **Purpose**: Main application controller and state management
- **Responsibilities**: 
  - Initialize application
  - Manage global state
  - Coordinate component interactions
  - Handle routing and navigation
- **Interface**: 
  ```javascript
  class ComplianceApp {
    constructor()
    init()
    updateProgress()
    saveState()
    loadState()
  }
  ```

#### 2. Header Component (header.html + components.js)
- **Purpose**: Display branding and overall progress matching reference design
- **Features**:
  - Royalust logo with elegant gold typography (Cinzel font)
  - Tagline in italic serif font matching reference style
  - Progress ring with gold/bronze color scheme
  - Responsive layout maintaining brand aesthetic
- **Interface**:
  ```javascript
  class HeaderComponent {
    render(progressData)
    updateProgress(percentage)
    animateProgressRing()
    applyBrandTypography()
  }
  ```

#### 3. Category Manager (components.js)
- **Purpose**: Render and manage compliance category cards
- **Features**:
  - Expandable/collapsible category sections
  - Individual progress tracking
  - Interactive checklist items
  - Risk level indicators
- **Interface**:
  ```javascript
  class CategoryCard {
    constructor(categoryData)
    render()
    expand()
    collapse()
    updateProgress()
    toggleItem(itemId)
  }
  ```

#### 4. Progress System (components.js)
- **Purpose**: Calculate and display completion metrics
- **Features**:
  - Real-time progress calculation
  - Visual progress bars and rings
  - Risk assessment based on completion
- **Interface**:
  ```javascript
  class ProgressTracker {
    calculateOverallProgress()
    calculateCategoryProgress(categoryId)
    assessRiskLevel()
    updateVisualIndicators()
  }
  ```

#### 5. Data Manager (data.js)
- **Purpose**: Handle compliance data and persistence
- **Features**:
  - Load structured compliance data
  - Save completion state to localStorage
  - Export functionality
- **Interface**:
  ```javascript
  class DataManager {
    loadComplianceData()
    saveProgress()
    exportReport()
    getSourceLinks()
  }
  ```

### Theme System

Based on the reference image, the design follows the established Royalust brand aesthetic with elegant gold/bronze typography on deep navy/cosmic backgrounds. The color scheme emphasizes luxury and professionalism while maintaining the mystical violet accents for interactive elements.

#### Typography System
```css
/* Primary Brand Typography - Matching Reference Image */
.royalust-heading {
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--royalust-gold);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.tagline-text {
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-weight: 400;
  font-style: italic;
  color: var(--champagne);
  opacity: 0.9;
}

.body-text {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: var(--champagne);
}
```

#### Color Palette (theme.css)
```css
:root {
  /* Primary Background Colors - Based on Reference Image */
  --cosmic-void: #0a0a1a;
  --deep-navy: #1a1a2e;
  --royal-navy: #16213e;
  --midnight-blue: #0f1419;
  
  /* Royalust Brand Colors - Gold/Bronze Typography */
  --royalust-gold: #d4af37;
  --bronze-light: #cd7f32;
  --bronze-dark: #b8860b;
  --champagne: #f7e7ce;
  --antique-brass: #cd7f32;
  
  /* Violet Accent Colors */
  --deep-violet: #2d1b69;
  --mystic-violet: #4a148c;
  --ethereal-purple: #6a1b9a;
  --lavender-mist: #9575cd;
  
  /* Status Colors */
  --success-green: #4caf50;
  --warning-amber: #ff9800;
  --error-red: #f44336;
  --info-blue: #2196f3;
  
  /* Glass Effects */
  --glass-white: rgba(255, 255, 255, 0.03);
  --glass-gold: rgba(212, 175, 55, 0.1);
  --glass-violet: rgba(106, 27, 154, 0.1);
  --glass-border: rgba(212, 175, 55, 0.2);
}
```

#### Background System
```css
/* Gradient Background - Matching Reference Image */
.main-background {
  background: linear-gradient(
    135deg,
    var(--midnight-blue) 0%,
    var(--deep-navy) 25%,
    var(--royal-navy) 50%,
    var(--cosmic-void) 100%
  );
  position: relative;
}

.background-overlay {
  background: radial-gradient(
    ellipse at center,
    rgba(106, 27, 154, 0.1) 0%,
    transparent 70%
  );
}
```

#### Button System - Matching Reference Design
```css
.primary-button {
  background: linear-gradient(135deg, var(--bronze-light), var(--royalust-gold));
  color: var(--midnight-blue);
  border: none;
  border-radius: 50px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.secondary-button {
  background: transparent;
  color: var(--champagne);
  border: 2px solid var(--glass-border);
  border-radius: 50px;
  backdrop-filter: blur(10px);
}
```

#### Animation Framework (animations.css)
- **Entrance Animations**: Elegant fade-in-up with gold shimmer effects
- **Hover Effects**: Subtle glow and scale with bronze/gold highlights
- **Progress Animations**: Smooth bar fills with golden progress indicators
- **Background Effects**: Subtle particle effects and gradient shifts
- **Typography Animations**: Letter-spacing and glow effects for headings

## Data Models

### Compliance Data Structure (compliance.json)
```json
{
  "categories": [
    {
      "id": "safe-operating-mode",
      "title": "Safe Operating Mode",
      "description": "Current low-risk operations framework",
      "icon": "🏝️",
      "priority": "high",
      "riskLevel": "low",
      "items": [
        {
          "id": "day-use-only",
          "title": "Run day-use, private educational workshops under PMA",
          "description": "Frame as educational retreats/sustainability workshops",
          "completed": false,
          "sources": [
            {
              "title": "Hawaii County Code Ch.25",
              "url": "https://www.hawaiicounty.gov/i-want-to/read/county-code"
            }
          ]
        }
      ]
    }
  ],
  "metadata": {
    "lastUpdated": "2024-12-06",
    "version": "1.0",
    "totalCategories": 9,
    "totalItems": 45
  }
}
```

### State Management
```javascript
// Application State Structure
const appState = {
  progress: {
    overall: 0,
    categories: {},
    completedItems: 0,
    totalItems: 45
  },
  ui: {
    expandedCategories: [],
    currentView: 'dashboard',
    theme: 'dark'
  },
  user: {
    lastVisit: null,
    preferences: {}
  }
};
```

## Error Handling

### Client-Side Error Management
1. **Data Loading Errors**: Graceful fallback to default data structure
2. **State Persistence Errors**: Continue with in-memory state, show warning
3. **Animation Errors**: Disable animations, maintain functionality
4. **Export Errors**: Show user-friendly error messages with retry options

### Validation System
```javascript
class ValidationSystem {
  validateComplianceData(data)
  validateUserInput(input)
  sanitizeExportData(data)
  handleValidationErrors(errors)
}
```

## Testing Strategy

### Unit Testing
- **Component Testing**: Individual component render and interaction tests
- **Data Management**: Validation of data loading, saving, and export functions
- **Progress Calculation**: Accuracy of percentage calculations and risk assessments
- **Animation System**: Proper animation timing and fallback behavior

### Integration Testing
- **Component Interaction**: Category expansion, progress updates, state synchronization
- **Data Flow**: End-to-end data loading, modification, and persistence
- **Responsive Design**: Layout and functionality across device sizes
- **Browser Compatibility**: Cross-browser testing for modern browsers

### User Acceptance Testing
- **Investor Workflow**: Complete investor review process simulation
- **Mobile Experience**: Touch interactions and responsive layout validation
- **Performance Testing**: Load times and animation smoothness
- **Accessibility Testing**: Screen reader compatibility and keyboard navigation

### Testing Tools and Framework
```javascript
// Test Structure Example
describe('ComplianceApp', () => {
  describe('Progress Calculation', () => {
    it('should calculate overall progress correctly')
    it('should update category progress when items change')
    it('should assess risk levels based on completion')
  })
  
  describe('Data Persistence', () => {
    it('should save state to localStorage')
    it('should restore state on page reload')
    it('should handle corrupted state gracefully')
  })
})
```

### Performance Considerations
- **Lazy Loading**: Load category details on expansion
- **Animation Optimization**: Use CSS transforms and opacity for smooth animations
- **State Updates**: Debounced progress calculations for rapid interactions
- **Memory Management**: Cleanup event listeners and animation frames

### Deployment Architecture
```
GitHub Repository
       ↓
   Git Push/PR
       ↓
  Vercel Auto-Deploy
       ↓
   Production Site
```

### Security Considerations
- **Input Sanitization**: Validate all user inputs and exported data
- **XSS Prevention**: Proper escaping of dynamic content
- **Content Security Policy**: Restrict resource loading to trusted sources
- **HTTPS Enforcement**: Ensure all traffic uses secure connections