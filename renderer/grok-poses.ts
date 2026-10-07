// Poses transcribed from the supplied grok-bot.html. No page scripts are bundled.
export interface GrokEye { l:string; t:string; w:string; h:string; rot:number }
export interface GrokPose {
 id:string; group:string; name:string; how:string;
 body:{w:number;h:number;radius:string;clip:string;rot:number;x:number;y:number;motion:string};
 eyes:boolean; L?:GrokEye; R?:GrokEye; smile?:boolean; brow?:boolean; orbit?:boolean; spark?:boolean;
 mark?:{w:number;h:number;top:string;radius:string};
}
export const grokPoses: GrokPose[] = [
  {
    "id": "glance",
    "group": "face",
    "name": "Glance",
    "how": "Default rest. Circle body bobs. Eyes sit high-right and tilt, like it is looking past you.",
    "body": {
      "w": 210,
      "h": 210,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 0,
      "motion": "bob"
    },
    "eyes": true,
    "L": {
      "l": "50%",
      "t": "23%",
      "w": "13%",
      "h": "27%",
      "rot": 10
    },
    "R": {
      "l": "67%",
      "t": "20%",
      "w": "12%",
      "h": "28%",
      "rot": 14
    }
  },
  {
    "id": "blink",
    "group": "face",
    "name": "Blink",
    "how": "Eyes flatten for a beat, then open. Fires on its own while idle so it feels alive.",
    "body": {
      "w": 210,
      "h": 210,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 0,
      "motion": "bob"
    },
    "eyes": true,
    "L": {
      "l": "50%",
      "t": "33%",
      "w": "13%",
      "h": "5%",
      "rot": 10
    },
    "R": {
      "l": "67%",
      "t": "31%",
      "w": "12%",
      "h": "5%",
      "rot": 14
    }
  },
  {
    "id": "squint",
    "group": "face",
    "name": "Squint",
    "how": "Eyes become thin horizontal slits and slide inward. Used when it is reading or unsure.",
    "body": {
      "w": 214,
      "h": 200,
      "radius": "50%",
      "clip": "none",
      "rot": -2,
      "x": 0,
      "y": 4,
      "motion": "none"
    },
    "eyes": true,
    "L": {
      "l": "30%",
      "t": "31%",
      "w": "20%",
      "h": "8%",
      "rot": -8
    },
    "R": {
      "l": "54%",
      "t": "30%",
      "w": "17%",
      "h": "7%",
      "rot": -2
    }
  },
  {
    "id": "look",
    "group": "face",
    "name": "Look away",
    "how": "Whole body leans, eyes travel to the side. Attention has moved off the task.",
    "body": {
      "w": 210,
      "h": 210,
      "radius": "50%",
      "clip": "none",
      "rot": -8,
      "x": -8,
      "y": 0,
      "motion": "none"
    },
    "eyes": true,
    "L": {
      "l": "16%",
      "t": "28%",
      "w": "14%",
      "h": "20%",
      "rot": -18
    },
    "R": {
      "l": "34%",
      "t": "26%",
      "w": "13%",
      "h": "20%",
      "rot": -14
    }
  },
  {
    "id": "up",
    "group": "face",
    "name": "Look up",
    "how": "Eyes rise to the top edge and lengthen. Thinking, or waiting on something above.",
    "body": {
      "w": 210,
      "h": 210,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": -4,
      "motion": "bob"
    },
    "eyes": true,
    "L": {
      "l": "38%",
      "t": "8%",
      "w": "12%",
      "h": "22%",
      "rot": 4
    },
    "R": {
      "l": "56%",
      "t": "7%",
      "w": "11%",
      "h": "22%",
      "rot": 8
    }
  },
  {
    "id": "wide",
    "group": "face",
    "name": "Surprised",
    "how": "Eyes go round and the body pulses once. Reaction to a result or a ping.",
    "body": {
      "w": 220,
      "h": 220,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 0,
      "motion": "pulse"
    },
    "eyes": true,
    "L": {
      "l": "32%",
      "t": "24%",
      "w": "18%",
      "h": "22%",
      "rot": 0
    },
    "R": {
      "l": "56%",
      "t": "24%",
      "w": "18%",
      "h": "22%",
      "rot": 0
    }
  },
  {
    "id": "wink",
    "group": "face",
    "name": "Wink",
    "how": "One eye closes, the other stays open and tilts. A small done or playful beat.",
    "body": {
      "w": 210,
      "h": 206,
      "radius": "50%",
      "clip": "none",
      "rot": 4,
      "x": 2,
      "y": 0,
      "motion": "none"
    },
    "eyes": true,
    "L": {
      "l": "30%",
      "t": "28%",
      "w": "14%",
      "h": "24%",
      "rot": 8
    },
    "R": {
      "l": "56%",
      "t": "34%",
      "w": "13%",
      "h": "5%",
      "rot": 12
    }
  },
  {
    "id": "sleepy",
    "group": "face",
    "name": "Sleepy",
    "how": "Body drops, eyes half-close and sink. Idle too long, or a finished quiet state.",
    "body": {
      "w": 214,
      "h": 186,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 10,
      "motion": "none"
    },
    "eyes": true,
    "L": {
      "l": "34%",
      "t": "36%",
      "w": "16%",
      "h": "9%",
      "rot": -6
    },
    "R": {
      "l": "56%",
      "t": "36%",
      "w": "15%",
      "h": "8%",
      "rot": 4
    }
  },
  {
    "id": "sad",
    "group": "face",
    "name": "Sad",
    "how": "Eyes droop and tilt down. Body sags. Used when a step fails.",
    "body": {
      "w": 200,
      "h": 196,
      "radius": "48% 48% 50% 50% / 42% 42% 58% 58%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 6,
      "motion": "none"
    },
    "eyes": true,
    "brow": true,
    "L": {
      "l": "30%",
      "t": "34%",
      "w": "14%",
      "h": "16%",
      "rot": 16
    },
    "R": {
      "l": "54%",
      "t": "34%",
      "w": "14%",
      "h": "16%",
      "rot": -16
    }
  },
  {
    "id": "happy",
    "group": "face",
    "name": "Happy",
    "how": "Eyes lift and curve up. Body widens a little and bobs. Success.",
    "body": {
      "w": 220,
      "h": 200,
      "radius": "50% 50% 46% 46% / 46% 46% 54% 54%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 2,
      "motion": "bob"
    },
    "eyes": true,
    "L": {
      "l": "28%",
      "t": "24%",
      "w": "15%",
      "h": "22%",
      "rot": 8
    },
    "R": {
      "l": "54%",
      "t": "22%",
      "w": "14%",
      "h": "24%",
      "rot": 12
    }
  },
  {
    "id": "circle",
    "group": "shape",
    "name": "Circle",
    "how": "Home shape. Smooth blob, always able to morph into any other form.",
    "body": {
      "w": 210,
      "h": 210,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 0,
      "motion": "bob"
    },
    "eyes": true,
    "L": {
      "l": "50%",
      "t": "23%",
      "w": "13%",
      "h": "27%",
      "rot": 10
    },
    "R": {
      "l": "67%",
      "t": "20%",
      "w": "12%",
      "h": "28%",
      "rot": 14
    }
  },
  {
    "id": "egg",
    "group": "shape",
    "name": "Egg",
    "how": "Stretches tall and leans. Eyes glance sideways. Curious, mid-thought.",
    "body": {
      "w": 188,
      "h": 246,
      "radius": "50% 54% 46% 48% / 40% 38% 60% 62%",
      "clip": "none",
      "rot": 10,
      "x": 4,
      "y": 6,
      "motion": "bob"
    },
    "eyes": true,
    "L": {
      "l": "44%",
      "t": "16%",
      "w": "15%",
      "h": "13%",
      "rot": -18
    },
    "R": {
      "l": "64%",
      "t": "14%",
      "w": "14%",
      "h": "13%",
      "rot": -10
    }
  },
  {
    "id": "widebody",
    "group": "shape",
    "name": "Wide",
    "how": "Flattens. Listening or holding a wide result. Eyes spread apart.",
    "body": {
      "w": 250,
      "h": 168,
      "radius": "46%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 8,
      "motion": "none"
    },
    "eyes": true,
    "L": {
      "l": "22%",
      "t": "28%",
      "w": "14%",
      "h": "22%",
      "rot": 6
    },
    "R": {
      "l": "62%",
      "t": "26%",
      "w": "13%",
      "h": "22%",
      "rot": 10
    }
  },
  {
    "id": "pill",
    "group": "shape",
    "name": "Pill",
    "how": "Squeezes into a tall capsule and tips. Transition shape into the alert mark.",
    "body": {
      "w": 78,
      "h": 196,
      "radius": "80px",
      "clip": "none",
      "rot": -18,
      "x": 8,
      "y": -10,
      "motion": "none"
    },
    "eyes": true,
    "L": {
      "l": "28%",
      "t": "16%",
      "w": "28%",
      "h": "16%",
      "rot": 0
    },
    "R": {
      "l": "28%",
      "t": "40%",
      "w": "28%",
      "h": "16%",
      "rot": 0
    }
  },
  {
    "id": "alert",
    "group": "shape",
    "name": "Alert",
    "how": "Body becomes the stem of an exclamation. A separate dot drops under it. Needs attention.",
    "body": {
      "w": 52,
      "h": 132,
      "radius": "40px",
      "clip": "none",
      "rot": -14,
      "x": 6,
      "y": -36,
      "motion": "none"
    },
    "eyes": false,
    "mark": {
      "w": 36,
      "h": 40,
      "top": "66%",
      "radius": "50% 50% 42% 42%"
    }
  },
  {
    "id": "bang",
    "group": "shape",
    "name": "Bang",
    "how": "Alert settles upright. Stem and round dot. Error or “look at this”.",
    "body": {
      "w": 46,
      "h": 124,
      "radius": "40px",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": -40,
      "motion": "pulse"
    },
    "eyes": false,
    "mark": {
      "w": 40,
      "h": 40,
      "top": "64%",
      "radius": "50%"
    }
  },
  {
    "id": "dot",
    "group": "shape",
    "name": "Dot",
    "how": "Collapses to a small ball. Waiting, loading, or between tasks. Eyes hide.",
    "body": {
      "w": 48,
      "h": 48,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 0,
      "motion": "pulse"
    },
    "eyes": false
  },
  {
    "id": "triangle",
    "group": "shape",
    "name": "Triangle",
    "how": "Morphs into a rounded play-like wedge and grows a green smile. Ready or go.",
    "body": {
      "w": 236,
      "h": 210,
      "radius": "42%",
      "clip": "polygon(16% 80%, 48% 6%, 94% 68%, 76% 90%, 26% 92%)",
      "rot": -8,
      "x": 8,
      "y": 4,
      "motion": "none"
    },
    "eyes": false,
    "smile": true
  },
  {
    "id": "square",
    "group": "shape",
    "name": "Soft square",
    "how": "Corners come in. A more “tool” pose, still the same character. Eyes stay calm.",
    "body": {
      "w": 200,
      "h": 200,
      "radius": "28%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 0,
      "motion": "none"
    },
    "eyes": true,
    "L": {
      "l": "26%",
      "t": "26%",
      "w": "16%",
      "h": "18%",
      "rot": 0
    },
    "R": {
      "l": "56%",
      "t": "26%",
      "w": "16%",
      "h": "18%",
      "rot": 0
    }
  },
  {
    "id": "drop",
    "group": "shape",
    "name": "Drop",
    "how": "Points downward. Directing attention at a spot on the page.",
    "body": {
      "w": 180,
      "h": 220,
      "radius": "50% 50% 50% 50% / 46% 46% 70% 70%",
      "clip": "polygon(50% 96%, 8% 42%, 22% 18%, 50% 6%, 78% 18%, 92% 42%)",
      "rot": 0,
      "x": 0,
      "y": 8,
      "motion": "bob"
    },
    "eyes": true,
    "L": {
      "l": "30%",
      "t": "28%",
      "w": "16%",
      "h": "16%",
      "rot": 0
    },
    "R": {
      "l": "54%",
      "t": "28%",
      "w": "16%",
      "h": "16%",
      "rot": 0
    }
  },
  {
    "id": "working",
    "group": "face",
    "name": "Working",
    "how": "Eyes squint and color rings orbit the body. It is using a tool or running a task.",
    "body": {
      "w": 198,
      "h": 198,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 0,
      "motion": "none"
    },
    "eyes": true,
    "orbit": true,
    "L": {
      "l": "24%",
      "t": "30%",
      "w": "16%",
      "h": "9%",
      "rot": -6
    },
    "R": {
      "l": "50%",
      "t": "28%",
      "w": "14%",
      "h": "8%",
      "rot": 4
    }
  },
  {
    "id": "dizzy",
    "group": "face",
    "name": "Dizzy",
    "how": "Body shakes, a ring spins, eyes go small and round. Overloaded or looping.",
    "body": {
      "w": 200,
      "h": 200,
      "radius": "50%",
      "clip": "none",
      "rot": 0,
      "x": 0,
      "y": 0,
      "motion": "shake"
    },
    "eyes": true,
    "spark": true,
    "L": {
      "l": "30%",
      "t": "30%",
      "w": "14%",
      "h": "14%",
      "rot": 0
    },
    "R": {
      "l": "54%",
      "t": "30%",
      "w": "14%",
      "h": "14%",
      "rot": 0
    }
  }
];
export const grokPlayOrder = ['glance','blink','glance','squint','look','up','wide','wink','sleepy','sad','happy','circle','egg','widebody','pill','alert','bang','dot','triangle','square','drop','working','dizzy','glance'];
