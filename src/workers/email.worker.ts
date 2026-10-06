import { db } from "../prisma/db";
import redis from "../lib/redis";
import { Worker } from "bullmq";
import { invitationEmailTemplate, interviewEmailTemplate, sendEmail } from "../lib/email";


const worker = new Worker("Email", async (job) => {
if (job.name === "sendInvitationEmail") {
try{
    const { email, link } = job.data;
     
    const html = invitationEmailTemplate(link);
    await sendEmail(email, "You're invited to join our organization", html);
}
catch(error){
console.error("Email sending error:", error);
}
}

if (job.name === "sendInterviewEmail") {
try{
    const { link, companyName, role, email } = job.data;
     
    const html = interviewEmailTemplate({ interviewLink: link, companyName, jobRole: role });
    await sendEmail(email, "Invitation for Interview", html);
}
catch(error){
console.error("Email sending error:", error);
}
}



}, { connection: redis });