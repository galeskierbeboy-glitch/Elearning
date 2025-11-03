import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { API_BASE } from '../../services/api';
import Navbar from '../../components/Navbar';

// Lesson reader page: view lesson content (text, PDF, video)
// Route: /lessons/:lessonId

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    // handle youtu.be short links
    const shortMatch = url.match(/youtu\.be\/(.+)$/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1].split(/[?#]/)[0]}`;

    const longMatch = url.match(/[?&]v=([^&]+)/);
    if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;

    // also handle /embed/ style
    const embedMatch = url.match(/youtube\.com\/embed\/(.+)$/);
    if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1].split(/[?#]/)[0]}`;
  } catch (e) {
    return null;
  }
  return null;
}

export default function Lessons() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await api.get(`/lessons/${lessonId}`);
        setLesson(res.data);
      } catch (err) {
        console.error('Failed to fetch lesson', err);
        setError('Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };
    if (lessonId) fetchLesson();
  }, [lessonId]);

  if (loading) return <div className="p-4">Loading lesson...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!lesson) return <div className="p-4">Lesson not found.</div>;

  const embedUrl = getYouTubeEmbedUrl(lesson.video_url);

  const filePath = lesson.file_path || null;
  // Resolve file path to absolute URL so SPA router does not intercept navigation.
  const resolveUrl = (p) => {
    if (!p) return null;
    // If already absolute (http(s)), return as-is
    if (/^https?:\/\//i.test(p)) return p;
    // Otherwise prefix with API base origin (strip trailing /api)
    const base = API_BASE.replace(/\/api\/?$/, '');
    return `${base}${p.startsWith('/') ? '' : '/'}${p}`;
  };
  const fileUrl = resolveUrl(filePath);

  return (
    <div className="container mx-auto px-4 py-8">
      <Navbar />
      <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
      {lesson.description && <p className="text-gray-600 mb-4">{lesson.description}</p>}

      {embedUrl ? (
        // Center and constrain the iframe to a max width so it's not too large on wide screens
        <div className="mb-6 flex justify-center">
          <div style={{ position: 'relative', paddingTop: '56.25%', width: '100%', maxWidth: '720px' }}>
            <iframe
              title={lesson.title}
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 8 }}
            />
          </div>
        </div>
      ) : lesson.video_url ? (
        // non-YouTube video URL - constrain width and center
        <div className="mb-6 flex justify-center">
          <video
          controls
          src={lesson.video_url}
          style={{ width: '100%', maxWidth: '960px', height: '540px', borderRadius: 8 }}
            />
        </div>
      ) : null}

      {filePath ? (
        // embedded PDF (uploaded) or link - show in iframe. Use absolute URL to avoid SPA routing.
        <div className="mb-6 flex justify-center">
          <iframe src={fileUrl} title="Lesson file" style={{ width: '100%', maxWidth: '720px', height: '720px', borderRadius: 8 }} />
        </div>
      ) : lesson.content ? (
        // if content looks like a pdf link, show link otherwise render text
        lesson.content.toLowerCase().includes('.pdf') ? (
          <a href={resolveUrl(lesson.content)} target="_blank" rel="noreferrer" className="text-blue-600 underline">
            Open PDF
          </a>
        ) : (
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content }} />
        )
      ) : null}
    </div>
  );
}
