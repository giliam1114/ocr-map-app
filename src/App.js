import React, { useState } from "react";
import { createWorker } from "tesseract.js";

export default function App() {
  const [image, setImage] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleOCR = async () => {
    if (!image) return;
    setIsLoading(true);

    const worker = await createWorker("jpn+eng");
    const result = await worker.recognize(image);
    setOcrText(result.data.text);
    await worker.terminate();

    setIsLoading(false);
  };

  const generateGeoJSON = async () => {
    const lines = ocrText
      .split("\n")
      .filter((line) => /都|道|府|県|市|区|町|村/.test(line));

    const features = [];

    for (let i = 0; i < lines.length; i++) {
      const address = lines[i];
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            address
          )}`
        );
        const data = await res.json();

        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          features.push({
            type: "Feature",
            properties: { name: `目的地${i + 1}`, address },
            geometry: {
              type: "Point",
              coordinates: [lon, lat],
            },
          });
        }
      } catch (err) {
        console.error("住所のジオコーディング失敗:", err);
      }
    }

    const geojson = {
      type: "FeatureCollection",
      features,
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "destinations.geojson";
    a.click();
  };

  return (
    <div
      style={{
        padding: "16px",
        maxWidth: "100%",
        margin: "0 auto",
        fontFamily: "sans-serif",
        fontSize: "16px",
        lineHeight: "1.5",
      }}
    >
      <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>📷 OCRで住所読み取り</h2>

      {/* 画像アップロード */}
      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginBottom: "10px" }} />

      {/* プレビュー */}
      {image && (
        <img
          src={image}
          alt="preview"
          style={{
            width: "100%",
            maxHeight: "300px",
            objectFit: "contain",
            marginBottom: "10px",
            borderRadius: "8px",
          }}
        />
      )}

      {/* OCR実行ボタン */}
      <button
        onClick={handleOCR}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "16px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          marginBottom: "12px",
        }}
      >
        {isLoading ? "読み取り中…" : "OCR 実行"}
      </button>

      {/* OCR結果表示 */}
      {ocrText && (
        <div style={{ marginBottom: "16px", whiteSpace: "pre-wrap" }}>
          <h3 style={{ fontSize: "16px" }}>📄 抽出結果</h3>
          <p>{ocrText}</p>
        </div>
      )}

      {/* Googleマップリンク */}
      {ocrText && (
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px" }}>📍 Googleマップで表示</h3>
          {ocrText
            .split("\n")
            .filter((line) => /都|道|府|県|市|区|町|村/.test(line))
            .map((address, index) => (
              <div key={index} style={{ marginBottom: "6px" }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#007bff", textDecoration: "underline" }}
                >
                  {address}
                </a>
              </div>
            ))}
        </div>
      )}

      {/* GeoJSON生成ボタン */}
      {ocrText && (
        <button
          onClick={generateGeoJSON}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
          }}
        >
          🗺 GeoJSONを生成してダウンロード
        </button>
      )}
    </div>
  );
}
