# Project Requirements: Who Are You?
 
## 1. Project Overview

**Project Type:** Web-based Virtual Reality Interactive Experience

**Target Device:** Meta Quest VR Headset (Meta Quest Browser)

**Technology Stack:** JavaScript, Three.js, WebXR, Vite, TouchDesigner, WebSocket, and persistent data storage.

### Project Description

"Who Are You?" is an interactive VR experience exploring how different individuals form subjective perceptions of the same person.

Participants enter a virtual environment and encounter a shared 3D human-like persona. They receive a series of prompts about specific aspects of the persona, such as facial expression, hairstyle, clothing, and body appearance.

For each prompt, participants select one of three predefined responses: Positive, Neutral, or Negative.

The system maps each response to a visual category and generates a corresponding coloured particle contribution. Each contribution is assigned to a predefined region of the 3D persona based on the prompt.

Contributions from previous participants must remain visible. As more people interact with the experience, their contributions accumulate on the same persona, gradually forming a collective visual representation of different perceptions.

**Core Experience:** Participants see their own contribution appear and become part of an existing collection of contributions left by previous participants.

---

## 2. Technical Architecture

### 2.1. Selected Approach: 
The project uses two separate visual systems:

**A. Three.js / WebXR — VR Interaction**
- Runs in Meta Quest Browser.
- Displays the 3D persona and VR environment.
- Displays prompts and response options.
- Handles user input through VR controllers.
- Classifies selected responses.
- Generates and sends contribution data.

**B. TouchDesigner — External Visual Output**
- Runs separately on a laptop.
- Displays the particle-based persona on an external monitor or projector.
- Imports and processes the 3D persona model.
- Converts the persona into a particle / point cloud system.
- Updates particle colours and visual distribution based on incoming contribution data.
- Maintains the visual representation of accumulated contributions.

**C. Communication and Persistent Storage**
- Three.js and TouchDesigner communicate through WebSocket.
- Contribution data is stored in a persistent backend.
- Previous contributions are retrieved when a new session begins.
- New contributions are added without replacing existing ones.

### 2.2. Data Flow

The intended workflow is:

1. A participant selects a response in the VR application.
2. Three.js identifies the response category and its associated body region.
3. The application creates a contribution record.
4. The contribution is saved to persistent storage.
5. The application sends the relevant contribution data to TouchDesigner through WebSocket.
6. TouchDesigner updates the external particle visual.
7. Previous contributions remain visible alongside the new contribution.

**Important:** Three.js and TouchDesigner run as separate applications. They do not automatically share the same rendered 3D scene. They communicate through data and events.

The initial prototype only requires TouchDesigner to display the external visual output. Rendering TouchDesigner visuals inside the VR headset is not part of the current approach.

---

## 3. Functional Requirements

### Feature 1 — 3D Environment and Persona

- Display a 3D persona in the VR environment.
- Load the persona model from an external `.glb` or `.gltf` file.
- Support basic lighting, materials, and camera positioning.
- Define identifiable body regions for contribution placement.

**Suggested body regions:**
- Face / Head
- Upper Body / Clothing
- Lower Body / Clothing
- Arms
- Legs

Each region should have a predefined identifier that can be referenced by the application and TouchDesigner.

### Feature 2 — Prompt and Response Interface

- Display a prompt related to a specific aspect of the persona.
- Present three selectable response options.
- Allow selection through VR controller input.
- Provide clear visual feedback when an option is selected.

**Example:**

Prompt: How would you describe this person's facial expression?

- Distant
- Calm
- Friendly

Prompts should be configurable. Different prompts may use different answer wording while retaining the same three response categories.

### Feature 3 — Response Classification

The system must map each selected answer to a predefined response category.

For the initial prototype, classification must be rule-based rather than AI-based.

**Example response mapping:**

| Selected Answer | Category | Colour |
|---|---|---|
| Distant | Negative | Dark Blue |
| Calm | Neutral | Light Blue |
| Friendly | Positive | Pink |

The mapping should be configurable for different prompts.

The system does not need to interpret free-text answers or perform AI sentiment analysis.

### Feature 4 — Visual Fragment Generation and Placement

- Generate a visual contribution after each response selection.
- Assign the contribution a colour based on its response category.
- Associate each prompt with a predefined body region.
- Place the contribution on or around the corresponding region of the persona.
- Allow multiple contributions to coexist.
- Preserve previous contributions rather than replacing them.

The visual contribution may be represented by a group of particles or points within the particle-based persona.

The exact particle placement and visual behaviour can be refined during prototyping.

### Feature 5 — TouchDesigner Particle Visual System

- Import the 3D persona model into TouchDesigner.
- Experiment with GPU particle systems and point cloud conversion.
- Develop a particle-based representation of the persona.
- Receive contribution data from the web application.
- Update particle colours and visual distribution according to the response category and target body region.
- Maintain all accumulated contributions in the visual output.
- Save the TouchDesigner network as a functional `.toe` project file.

### Feature 6 — Persistent Collective Persona

The application must store contributions across different participant sessions.

Required behaviours:
- Save each new contribution.
- Retrieve existing contributions when a new session begins.
- Display previous contributions before adding new ones.
- Preserve all existing contributions.
- Ensure new contributions do not overwrite previous data.

**Suggested contribution data structure:**

| Field | Description |
|---|---|
| contributionId | Unique identifier for the contribution |
| promptId | Identifier of the prompt |
| selectedAnswer | Answer selected by the participant |
| responseCategory | Positive, Neutral, or Negative |
| colour | Associated visual colour |
| targetRegion | Predefined body region |
| timestamp | Time the contribution was created |

Additional fields, such as particle positions or anchor points, may be introduced if required by the visual implementation.

Contributions should not require personally identifiable participant information.

### Feature 7 — Application Integration

- Establish WebSocket communication between Three.js and TouchDesigner.
- Send contribution data when a participant selects a response.
- Include at least the response category and target body region in each contribution event.
- Allow TouchDesigner to update its visual output when new data arrives.
- Ensure the VR interaction and external visual output represent consistent contribution data.

The exact message format and connection implementation should be determined during technical planning.

---

## 4. Development Milestones

Development should proceed incrementally. Each milestone should be tested independently before moving to the next stage.

### Milestone 1 — 3D Model and Scene Setup

**Three.js:**
- Prepare and export the persona model.
- Set up a basic Vite and Three.js project.
- Load and display the persona model.
- Configure the basic 3D scene.

**TouchDesigner:**
- Import the persona model.
- Test conversion into a particle / point cloud representation.
- Experiment with controlling particle quantity and distribution.

**Expected outcome:** The persona can be displayed in Three.js and represented as a particle system in TouchDesigner.

### Milestone 2 — Basic Interaction

- Display prompts and three response options.
- Implement response selection using mouse input first.
- Map selected answers to Positive, Neutral, or Negative categories.
- Test the response logic independently of VR controllers.

**Expected outcome:** A participant can select an answer and the application correctly identifies its response category.

### Milestone 3 — Fragment Generation and Placement

- Generate coloured particle contributions based on selected responses.
- Define predefined body regions and their corresponding identifiers.
- Assign contributions to the correct regions.
- Test multiple contributions on the persona.

**Expected outcome:** Multiple coloured contributions can appear on the persona without replacing previous ones.

### Milestone 4 — TouchDesigner Visual Development

- Refine the GPU particle system.
- Experiment with particle colour and distribution.
- Create controls for response category and target body region.
- Test how new contributions affect the particle visual.
- Develop the visual accumulation effect.

**Expected outcome:** TouchDesigner can display a particle-based persona and update its appearance based on test contribution data.

### Milestone 5 — Application Integration

- Establish WebSocket communication between Three.js and TouchDesigner.
- Define a contribution message format.
- Send contribution data from the web application.
- Update the TouchDesigner visual when a new contribution is received.

**Expected outcome:** A response selected in Three.js can trigger a corresponding visual update in TouchDesigner