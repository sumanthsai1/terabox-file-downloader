export async function GET(req, res) {
  const { searchParams: params } = new URL(req.url);
  if (!params.has("data") || !params.has("index")) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }
  const encryptedData = params.get("data");
  const index = parseInt(params.get("index"), 10);

  if (!encryptedData || isNaN(index)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const secretKey = "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d";
  let url;
  try {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
    const { token: decryptedToken, expiresAt } = JSON.parse(decryptedData);
    url = decryptedToken;
    console.log(url, expiresAt);
    if (Date.now() > expiresAt) {
      return NextResponse.json({ error: "Expired token" }, { status: 401 });
    }
  } catch (error) {
    console.error("Decryption error:", error);
    return NextResponse.json(
      { error: "Invalid encrypted data" },
      { status: 400 }
    );
  }

  try {
    const req = await axios.get(url, { headers, withCredentials: true });
    const responseData = req.data;
    const jsToken = findBetween(responseData, "fn%28%22", "%22%29");
    const logid = findBetween(responseData, "dp-logid=", "&");
    if (!jsToken || !logid) {
      return NextResponse.json({ error: "Invalid response" }, { status: 400 });
    }

    const { searchParams: requestUrl, href } = new URL(
      req.request.res.responseUrl
    );
    if (!requestUrl.has("surl")) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const surl = requestUrl.get("surl");

    const listParams = {
      app_id: "250528",
      web: "1",
      channel: "dubox",
      clienttype: "0",
      jsToken: jsToken,
      dplogid: logid,
      page: "1",
      num: "20",
      order: "time",
      desc: "1",
      site_referer: href,
      shorturl: surl,
      root: "1",
    };

    const req2 = await axios.get("https://www.1024tera.com/share/list", {
      params: listParams,
      headers,
      withCredentials: true,
    });
    const responseData2 = req2.data;
    if (!("list" in responseData2)) {
      return NextResponse.json({ error: "Invalid response" }, { status: 400 });
    }

    return NextResponse.json(responseData2?.list[index], { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Unknown Error" }, { status: 400 });
  }
}
