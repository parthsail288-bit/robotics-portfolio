import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function generateImage(prompt: string, filename: string) {
  console.log(`Generating ${filename}...`);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
            aspectRatio: "4:3",
        },
    },
  });

  for (const part of response.candidates![0].content.parts) {
    if (part.inlineData) {
      const base64EncodeString = part.inlineData.data;
      fs.writeFileSync(filename, Buffer.from(base64EncodeString, 'base64'));
      console.log(`Saved ${filename}`);
      return;
    }
  }
  console.error(`Failed to generate ${filename}`);
}

async function main() {
  await generateImage("A high-tech industrial robotic arm working on a conveyor belt in a dark, futuristic factory setting. Neon yellow accents on the arm, sparks flying from the tip. Cinematic lighting, photorealistic.", "project1.jpg");
  await generateImage("A futuristic intelligent security system interface. A keypad with glowing blue numbers, a circuit board panel with neon yellow and blue traces, and a red laser beam crossing the frame. Dark metallic background, high-tech aesthetic.", "project2.jpg");
  await generateImage("A high-precision quadcopter drone hovering in a dark arena. The drone has neon yellow highlights. In the background, a large glowing neon sign says 'MINDSPARK'. Cinematic lighting, tech-focused, photorealistic.", "project3.jpg");
  await generateImage("Two small, rugged autonomous robots with wheels and neon yellow accents playing soccer with a white and black ball in a high-tech arena. Glowing floor lines, futuristic stadium atmosphere.", "project4.jpg");
  await generateImage("A professional high-fidelity UI dashboard on a computer monitor. The interface shows AI-powered learning analytics, graphs, and data visualizations. Dark mode theme with neon blue and green accents. Professional workspace setting.", "project5.jpg");
}

main().catch(console.error);
