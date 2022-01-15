import '../../lib/ipfs-http-client-index.min.js'
import '../../lib/ipfs-core-index.min.js';
import  "../../lib/ethers.5.5.1.umd.min.js";

const ipfs = await IpfsCore.create({ repo: 'ipfs-' + Math.random() });
// console.log(await ipfs.version());
// console.log(await ipfs.id());
const client = window.IpfsHttpClient.create({ host: "ipfs.infura.io", port: 5001, protocol: "https" });

export async function addFile(url) {
    const file =  await client.add(IpfsHttpClient.urlSource(url));
    const file2 =  await ipfs.add(IpfsHttpClient.urlSource(url));
    return file.cid.toString();
}

export async function addTextFile(content) {
    const file =  await client.add(content);
    const file2 =  await ipfs.add(content);
    return file.cid.toString();
}

async function getLocalUri(cid) {
    if (cid == 'undefined') {
        return '';
    }
    const stream = ipfs.cat(cid);
    let data = new Uint8Array();
    for await (const chunk of stream) {
        let newData = new Uint8Array(data.length + chunk.length);
        newData.set(data, 0);
        newData.set(chunk, data.length);
        data = newData;    
    }
    return data;
}

export async function getLocalUriJWT(cid) {
    let data = await getLocalUri(cid)
    data = ethers.utils.toUtf8String(data);
    return data;
}

export async function getLocalUriImage(cid) {
    const data = await getLocalUri(cid)
    const blob = new Blob([data]);
    return URL.createObjectURL(blob);
}

