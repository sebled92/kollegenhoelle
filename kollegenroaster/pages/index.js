import {useState} from "react"

export default function Home(){

const [input,setInput] = useState("")
const [reply,setReply] = useState("")
const [mode,setMode] = useState("normal")

async function roast(){

const res = await fetch("/api/chat",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
message:input,
mode:mode
})
})

const data = await res.json()

setReply(data.reply)

}

return(

<div style={{background:"black",color:"lime",minHeight:"100vh",padding:"2rem"}}>

<h1>🔥 Kollegenhalle 🔥</h1>

<textarea
value={input}
onChange={e=>setInput(e.target.value)}
placeholder="Kollegen Drama..."
style={{width:"400px",height:"150px",background:"#111",color:"white"}}
/>

<br/><br/>

<select value={mode} onChange={e=>setMode(e.target.value)}>
<option value="normal">Normal</option>
<option value="roast">Roast 🔥</option>
</select>

<button
onClick={roast}
style={{marginLeft:"1rem",padding:"10px 20px",background:"red"}}
>
ROAST
</button>

<div style={{marginTop:"2rem",background:"#222",padding:"20px"}}>
{reply || "Antwort erscheint hier"}
</div>

</div>

)

}