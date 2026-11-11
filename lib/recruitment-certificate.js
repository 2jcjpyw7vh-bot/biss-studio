export const certificateMaxBytes=3*1024*1024;

const signatures=[
  {mime:"application/pdf",extension:"pdf",bytes:[37,80,68,70,45]},
  {mime:"image/jpeg",extension:"jpg",bytes:[255,216,255]},
  {mime:"image/png",extension:"png",bytes:[137,80,78,71,13,10,26,10]}
];

export function certificateFormat(bytes) {
  return signatures.find(format=>format.bytes.every((value,index)=>bytes[index]===value)) || null;
}

export function certificateExtension(mime) {
  return signatures.find(format=>format.mime===mime)?.extension;
}
