# Computer Graphics - Exercise 6 - WebGL Basketball Court

## Group Members
- Tal Solovey
- Yossi Partouche

## Instructions
1. Clone this repository to your local machine
2. Make sure you have Node.js installed
3. Start the local web server: `node index.js`
4. Open your browser and go to http://localhost:8000
5. Select **Free** or **Timed (30 s)** mode and then press **Start**

## Controls
- **←/→/↑/↓** : Move ball on court (before shooting)  
- **W / S**     : Increase / decrease shot power (0–100%)  
- **Space**     : Shoot the ball along a parabolic arc  
- **R**         : Reset ball position & power  
- **O**         : Toggle Orbit camera on/off  
- **Mode**      : Select **Free** or **Timed (30 s)** mode  
- **Start**     : Begin game/reset stats & timer

## Physics System
- **Gravity**: constant downward acceleration (–9.8 m/s²)  
- **Elasticity**: restitution factor (0.6) on ground & rim collisions  
- **Friction**: horizontal velocity dampening on bounces (0.8)  
- **Launch**: speed interpolated between **5 m/s** (0% power) and **15 m/s** (100%)  
- **Trajectory**: calculates clearance angle to arc over hoop height + 1.5 m  
- **Collision**:  
  - **Ground**: bounce at y = radius  
  - **Rim**: torus collision normal, reflect velocity vector with restitution  
- **Trail**: 100‐segment fading polyline tracks the ball path

## Additional Features
- **Multiple Hoops:** Allow shooting at both hoops with automatic targeting
- **Combo System:** Consecutive shots award bonus points
- **Time Challenge:** Timed shooting challenges with countdown
- **Game Modes:** Different game modes (Free/Timed)
- **Ball Trail Effect:** Visual trail following the basketball during flight
- **Canvas-based 3D scoreboard** updated scored on canvas scoreboard

https://github.com/user-attachments/assets/4fa68ca0-f4b3-4ac9-8057-502540a0825e

