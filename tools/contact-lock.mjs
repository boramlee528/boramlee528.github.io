// 연락처(이름·휴대폰·이메일)를 공유 코드로 암호화해 data.js에 넣을 값을 만듭니다.
// 원문 연락처는 저장소에 남기지 말고, 이 명령을 실행할 때만 입력하세요.
//
// 사용법:
//   node tools/contact-lock.mjs <공유코드> "<이름>" "<휴대폰>" "<이메일>"
// 출력된 contactLock 값을 data.js의 contactLock에 그대로 붙여 넣습니다.
// 공유 링크: https://boramlee528.github.io/#c=<공유코드>
import { webcrypto as crypto } from "node:crypto";

const [code, name, phone, email] = process.argv.slice(2);
if (!code || !phone || !email) {
  console.error('사용법: node tools/contact-lock.mjs <공유코드> "<이름>" "<휴대폰>" "<이메일>"');
  process.exit(1);
}

const ITER = 150000;
const enc = new TextEncoder();
const b64 = (buf) => Buffer.from(buf).toString("base64");
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
);
const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify({ name, phone, email })));
console.log(JSON.stringify({ iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(data) }, null, 2));
