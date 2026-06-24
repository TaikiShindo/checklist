export default async function handler(req, res) {
  const KV_REST_API_URL = process.env.KV_REST_API_URL;
  const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

  // Vercel KVが設定されていない場合はエラーを返す
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'KV database not configured' });
  }

  // REST APIを使ってKV(Redis)と通信する関数
  const fetchKV = async (body) => {
    const response = await fetch(KV_REST_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return response.json();
  };

  // GETリクエスト（メッセージの取得）
  if (req.method === 'GET') {
    try {
      // リストから最新の50件を取得
      const data = await fetchKV(["LRANGE", "pb_messages", 0, 49]);
      if (data.result && Array.isArray(data.result)) {
        // 文字列として保存されているのでオブジェクトに変換し、上から古い順に並び替える
        const msgs = data.result.map(str => JSON.parse(str)).reverse();
        return res.status(200).json(msgs);
      } else {
        return res.status(200).json([]);
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POSTリクエスト（メッセージの送信）
  if (req.method === 'POST') {
    try {
      const { name, text, time } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required' });

      const msgObj = JSON.stringify({ name, text, time });
      
      // リストの先頭(左側)に新しいメッセージを追加
      await fetchKV(["LPUSH", "pb_messages", msgObj]);
      // リストの長さを50件に保つ
      await fetchKV(["LTRIM", "pb_messages", 0, 49]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // その他のメソッドは許可しない
  return res.status(405).json({ error: 'Method not allowed' });
}
