export default async function handler(req, res) {

if (req.method !== 'POST') {
return res.status(405).json({reply:'POST only'})
}

const {message, mode='normal'} = req.body

const prompt =
mode === "roast"
? "Roaste diesen nervigen Kollegen brutal sarkastisch in zwei Sätzen."
: "Kommentiere sarkastisch eine Geschichte über einen nervigen Kollegen."

try {

const r = await fetch("https://api.together.xyz/v1/chat/completions",{
method:"POST",
headers:{
"Authorization":`Bearer ${process.env.TOGETHER_API_KEY}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
model:"meta-llama/Llama-3-70b-chat-hf",
messages:[
{role:"system",content:prompt},
{role:"user",content:message}
],
temperature:0.9,
max_tokens:120
})
})

const data = await r.json()

res.json({
reply: data.choices?.[0]?.message?.content || "Keine Antwort."
})

} catch(e){

res.json({
reply:"Fehler: "+e.message
})

}

}