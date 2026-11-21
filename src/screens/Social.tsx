import { Fragment, useRef, useState } from 'react';
import type { Nav } from '../router';
import type { Post } from '../types';
import { actions, run, useStore } from '../store/store';
import { mediaUrl } from '../api';
import { resizeImage } from '../image';
import { Icon } from '../components/Icon';
import { Empty, TopBar } from '../components/Layout';
import { AdBanner, HeroSlider } from '../components/Promo';

export const timeAgo = (t: number) => {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export function Social({ nav }: { nav: Nav }) {
  const posts = useStore((s) => s.posts).filter((p) => !p.hidden);
  const [tab, setTab] = useState<'latest' | 'top'>('latest');
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const sorted = tab === 'top' ? [...posts].sort((a, b) => b.likes.length - a.likes.length) : posts;

  const pick = async (f?: File) => {
    if (!f) return;
    try { setDraft(await resizeImage(f)); } catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="screen">
      <TopBar title="Moments" right={
        <button className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Share a moment"><Icon name="plus" /></button>} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />

      <HeroSlider placement="social" nav={nav} />

      <button className="share-cta" onClick={() => fileRef.current?.click()}>
        <span className="share-cta-icon">📸</span>
        <span className="row-body"><strong>Share your night at Rizz</strong><small className="muted">Post a photo — the best one each week wins a bottle 🍾</small></span>
      </button>

      <div className="seg">
        <button className={tab === 'latest' ? 'on' : ''} onClick={() => setTab('latest')}>Latest</button>
        <button className={tab === 'top' ? 'on' : ''} onClick={() => setTab('top')}>🔥 Top this week</button>
      </div>

      {sorted.length === 0 && <Empty emoji="🥂" title="No moments yet" text="Be the first to share a photo from tonight." />}
      <div className="feed">
        {sorted.map((p, i) => (
          <Fragment key={p.id}>
            <PostCard post={p} />
            {i % 4 === 1 && <AdBanner placement="social" nav={nav} index={i} />}
          </Fragment>
        ))}
      </div>

      {draft && <Composer image={draft} onClose={() => setDraft(null)} onChange={() => fileRef.current?.click()} />}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const me = useStore((s) => s.customerId);
  const liked = post.likes.includes(me);
  const [burst, setBurst] = useState(false);
  const like = () => { run(actions.toggleLike(post.id)); if (!liked) { setBurst(true); setTimeout(() => setBurst(false), 600); } };
  return (
    <article className="post">
      <header className="post-head">
        <div className="post-avatar">{post.author.slice(0, 1).toUpperCase()}</div>
        <div className="row-body"><strong>{post.author}</strong><span className="tiny muted">{timeAgo(post.createdAt)} · Rizz Bar</span></div>
        {post.featured && <span className="tag tag-lime">★ Featured</span>}
        {post.customerId === me && (
          <button className="link danger small" onClick={() => { if (confirm('Delete this post?')) run(actions.deletePost(post.id)); }}>Delete</button>
        )}
      </header>
      <div className="post-img" onDoubleClick={() => !liked && like()}>
        <img src={mediaUrl(post.image)} alt={post.caption || `Photo by ${post.author}`} loading="lazy" />
        {burst && <span className="like-burst">♥</span>}
      </div>
      <footer className="post-foot">
        <button className={`like-btn ${liked ? 'on' : ''}`} onClick={like} aria-label="Like">
          <Icon name="heart" fill={liked} /> <span>{post.likes.length}</span>
        </button>
        {post.caption && <p><strong>{post.author.split(' ')[0]}</strong> {post.caption}</p>}
      </footer>
    </article>
  );
}

function Composer({ image, onClose, onChange }: { image: string; onClose: () => void; onChange: () => void }) {
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const post = async () => {
    setBusy(true); setErr('');
    try { await actions.createPost(image, caption.trim()); onClose(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>New moment</h3>
        <img className="composer-img" src={image} alt="Preview" />
        <button className="link small" onClick={onChange}>Choose a different photo</button>
        <textarea rows={2} maxLength={280} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Say something… tag your crew, your drink 🍸" />
        <p className="tiny muted">Keep it classy — posts are visible to everyone in the app and on the bar's screens.</p>
        {err && <p className="error">{err}</p>}
        <div className="row-gap">
          <button className="btn btn-ghost grow" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary grow" onClick={post} disabled={busy}>{busy ? 'Posting…' : 'Post'}</button>
        </div>
      </div>
    </div>
  );
}
