import React, { useState } from "react";
import axios from "axios";
import "../styles/RegisterPage.css";

function RegisterPage({ onSuccess }) {
  const [image, setImage] = useState(null);
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!image || !email || !title) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("image", image);
    formData.append("email", email);
    formData.append("title", title);
    formData.append("description", description);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/images/register",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Register Your Image</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Image *</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
            />
            {image && <p className="file-name">✅ {image.name}</p>}
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Artwork"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your artwork"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "⏳ Uploading..." : "📤 Register Image"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
