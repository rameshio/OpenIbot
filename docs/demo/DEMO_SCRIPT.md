# OpenIbot Demo Script

This script provides step-by-step instructions for recording a 45–90 second high-quality demo video of OpenIbot for the repository.

### Recording Settings
- **Resolution:** 1920x1080 or 2560x1440 (16:9 ratio)
- **Framerate:** 60fps for smooth UI transitions and avatar animations
- **Cursor:** Keep cursor visible but move it smoothly and deliberately. Do not capture the taskbar or other OS elements if possible (record just the OpenIbot window).

---

### Scene 1: Introduction (0-5s)
**Visual:** The OpenIbot window opens. The camera zooms slightly into the main workspace.
**Action:** The user is on the main "What are we working on?" screen.
**On-screen text (Overlay):** 
**OpenIbot**
One workspace. Multiple AI models. Specialized agents.

### Scene 2: Task Composer (5-15s)
**Visual:** The user types a realistic task.
**Action:** Type into the composer: *"Research the benefits and challenges of using small language models for local AI applications and prepare a short report."*
**Narration (Optional):** "Give OpenIbot a complex task, and it takes care of the rest."

### Scene 3: Model Selection (15-25s)
**Visual:** The user clicks the model selection dropdown near the composer.
**Action:** The model menu opens, showing various providers (OpenAI, Claude, Gemini, Local). The user selects **Claude 3.5 Sonnet** (or another prominent model).
**On-screen text (Overlay):** Route work through your favorite AI models.

### Scene 4: Starting the Task (25-40s)
**Visual:** The user clicks the "Send" arrow.
**Action:** The screen transitions as Chief starts analyzing the task. Show the status changing from "Planning" to "Creating Agents" to "Working". 
**Narration (Optional):** "The Chief orchestrator breaks down your request, spins up isolated Linux workspaces, and assigns specialized agents to get it done."

### Scene 5: Agents View (40-55s)
**Visual:** The user clicks on the "Agents" tab in the chat/sidebar.
**Action:** Show the list of agents (e.g., Researcher, Writer). Click on an agent to expand its details and show the terminal or browser activity inside its secure Docker container. 
**On-screen text (Overlay):** Real autonomous agents. Secure local environments.

### Scene 6: Graph View (55-65s)
**Visual:** The user clicks on the "Graph" tab.
**Action:** The visual node graph shows how Chief delegates to the Researcher and Writer, and how data flows back for final review. Hover over a node to show its status.

### Scene 7: Files & Results (65-75s)
**Visual:** The user clicks on the "Files" tab.
**Action:** Open the generated `report.md` file. Scroll through the high-quality output.

### Scene 8: Completion (75-90s)
**Visual:** The chat returns to the main view showing the final summarized response from Chief. The status says "Completed".
**Action:** The user scrolls through the final summary. 
**On-screen text (Overlay):** 
**OpenIbot**
Open-source AI agent workspace.
github.com/rameshio/OpenIbot
