import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentList, type AttachmentItem } from './AttachmentList';

const items: AttachmentItem[] = [
  {
    id: 'a',
    name: 'gate.png',
    sizeLabel: '1 MB',
    href: '/f/a',
    previewSrc: '/f/a',
    status: 'done',
  },
  { id: 'b', name: 'report.pdf', sizeLabel: '2 MB', href: '/f/b' },
  { id: 'c', name: 'clip.mp4', sizeLabel: '9 MB', status: 'uploading' },
  { id: 'd', name: 'bad.mov', sizeLabel: '3 MB', status: 'failed' },
];

describe('AttachmentList', () => {
  it('shows an image thumbnail, a link for files, and upload state', () => {
    const { container } = render(<AttachmentList items={items} label="Files" />);
    const list = screen.getByRole('list', { name: 'Files' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(container.querySelector('img')).toHaveAttribute('src', '/f/a');
    expect(screen.getByRole('link', { name: 'report.pdf' })).toHaveAttribute('href', '/f/b');
    expect(screen.queryByRole('link', { name: 'clip.mp4' })).not.toBeInTheDocument();
    expect(screen.getByText(/Uploading/)).toBeInTheDocument();
    expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
  });

  it('removes and retries by id, with caller labels', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onRetry = vi.fn();
    render(
      <AttachmentList
        items={items}
        onRemove={onRemove}
        onRetry={onRetry}
        removeLabel="Quitar"
        retryLabel="Reintentar"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledWith('d');
    await user.click(screen.getByRole('button', { name: 'Quitar: report.pdf' }));
    expect(onRemove).toHaveBeenCalledWith('b');
    expect(screen.getAllByRole('button', { name: /Quitar/ })).toHaveLength(4);
  });

  it('has no buttons without handlers', () => {
    render(<AttachmentList items={items} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
