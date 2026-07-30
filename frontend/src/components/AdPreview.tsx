type Props = {
  creativeUrl: string;
  domain?: string;
};

export function AdPreview({ creativeUrl, domain }: Props) {
  const valid = /^https?:\/\//i.test(creativeUrl);
  return (
    <div data-tour="preview">
      <h2>Ad Preview</h2>
      <p className="lead">
        Publisher frame{domain ? ` · ${domain}` : ""} — 728×90 style banner.
      </p>
      <div className="preview-frame">
        <span className="preview-badge">Ad</span>
        {valid ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img src={creativeUrl} alt="Ad creative preview" />
        ) : (
          <span className="preview-placeholder">YOUR CREATIVE HERE</span>
        )}
      </div>
    </div>
  );
}
