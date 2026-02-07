export const SLOW_TURN_THRESHOLD = 60_000

export const LOCALSTORAGE_GAME_KEY = 'scrabblescore_current_game'

export const backgroundPatterns = [
  // Cambridge - Gothic arches
  {
    background: `
      radial-gradient(ellipse 100% 150% at 50% 0%, rgba(60,80,120,0.3) 0%, transparent 50%),
      repeating-linear-gradient(90deg, transparent 0px, transparent 60px, rgba(80,70,60,0.15) 60px, rgba(80,70,60,0.15) 62px),
      repeating-linear-gradient(0deg, transparent 0px, transparent 100px, rgba(80,70,60,0.1) 100px, rgba(80,70,60,0.1) 102px),
      linear-gradient(180deg, #2a2520 0%, #3d3530 50%, #2a2822 100%)`,
    size: 'cover',
  },
  // Wine - Rich burgundy waves
  {
    background: `
      radial-gradient(ellipse 80% 50% at 10% 90%, rgba(120,40,60,0.4) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 90% 10%, rgba(100,30,50,0.3) 0%, transparent 50%),
      radial-gradient(ellipse 100% 60% at 50% 100%, rgba(80,20,40,0.35) 0%, transparent 70%),
      linear-gradient(135deg, #2d1a1f 0%, #3d2028 50%, #2a1820 100%)`,
    size: 'cover',
  },
  // Paragliding - Open sky
  {
    background: `
      radial-gradient(ellipse 120% 80% at 30% 20%, rgba(140,180,220,0.2) 0%, transparent 50%),
      radial-gradient(ellipse 80% 60% at 70% 70%, rgba(100,140,180,0.15) 0%, transparent 40%),
      radial-gradient(ellipse 50% 30% at 20% 60%, rgba(200,220,240,0.1) 0%, transparent 50%),
      linear-gradient(180deg, #1e3040 0%, #2a4050 30%, #354858 70%, #3d525f 100%)`,
    size: 'cover',
  },
  // Annecy - Lake reflections
  {
    background: `
      radial-gradient(ellipse 150% 40% at 50% 80%, rgba(80,160,180,0.25) 0%, transparent 60%),
      radial-gradient(ellipse 100% 30% at 30% 90%, rgba(60,140,160,0.2) 0%, transparent 50%),
      radial-gradient(ellipse 80% 50% at 70% 30%, rgba(100,180,160,0.15) 0%, transparent 40%),
      linear-gradient(180deg, #1a2e30 0%, #234040 40%, #1e3838 100%)`,
    size: 'cover',
  },
  // Yoga - Warm sunset meditation
  {
    background: `
      radial-gradient(circle at 50% 50%, rgba(220,180,120,0.15) 0%, rgba(200,150,100,0.1) 20%, transparent 45%),
      radial-gradient(circle at 50% 50%, transparent 35%, rgba(180,130,80,0.08) 36%, transparent 38%),
      radial-gradient(circle at 50% 50%, transparent 50%, rgba(160,110,60,0.06) 51%, transparent 53%),
      radial-gradient(ellipse 120% 80% at 80% 90%, rgba(180,100,60,0.2) 0%, transparent 50%),
      linear-gradient(135deg, #2e2418 0%, #3d3020 50%, #2a2218 100%)`,
    size: 'cover',
  },
]
