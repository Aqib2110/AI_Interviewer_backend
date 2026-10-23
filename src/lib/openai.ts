import OpenAI from "openai";
import { OpenAIError } from "../Errors/openi.error";
import { AppError } from "../Errors/App.error";

export const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const sessionConfig = JSON.stringify({
  type: "realtime",
  model: "gpt-realtime-2.1",
  audio: { output: { voice: "marin" } },
});



export const openAILiveSession = async(body:any)=>{
   const fd = new FormData();
  
    fd.set("sdp", body);
    fd.set("session", sessionConfig);
  
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Safety-Identifier": "hashed-user-id",
      },
      body: fd,
    });
  
    const responseText = await response.text();
  
    if (!response.ok) {
      let errorData: any;
  
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = {
          error: {
            message: responseText,
          },
        };
      }
  
      throw new OpenAIError(
        errorData?.error?.message || "OpenAI Realtime API request failed",
        response.status,
        {
          code: errorData?.error?.code,
          type: errorData?.error?.type,
          param: errorData?.error?.param,
        },
      );
    }
    const location = response.headers.get("Location");
    const callId = location?.split("/").pop()?.toString();
  
    if (!callId) {
      throw new AppError("call id not found", 500);
    }

    return {callId, responseText};
}


export const openAILiveSessionEnd = async(aiSessionId:string)=>{
  const response = await fetch(
          `https://api.openai.com/v1/realtime/calls/${aiSessionId}/hangup`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.text();

          throw new Error(
            `Failed to hangup realtime call: ${response.status} ${error}`
          );
        }
}