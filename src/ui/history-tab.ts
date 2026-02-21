/**
 * HistoryTab - Push history management interface
 */

// Tampermonkey global declarations
declare const GM_setClipboard: (text: string) => void;
declare const GM_getClipboard: () => string;

import type { PushHistoryItem, NotificationPayload } from '../types';
import { StorageManager } from '../storage/storage-manager';
import { BarkClient } from '../api/bark-client';
import { t } from '../i18n';
import type { ToastManager } from './toast';

export class HistoryTab {
  private containerElement: HTMLElement | null = null;
  private storage: StorageManager;
  private toast: ToastManager;
  private barkClient: BarkClient;
  private selectedIds: Set<string> = new Set();
  private filterText: string = '';

  constructor(storage: StorageManager, toast: ToastManager, barkClient: BarkClient) {
    this.storage = storage;
    this.toast = toast;
    this.barkClient = barkClient;
  }

  /**
   * Render the history tab
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'history-tab';
    this.containerElement = container;

    this.renderContent();

    return container;
  }

  /**
   * Render the tab content
   */
  private renderContent(): void {
    if (!this.containerElement) return;

    const history = this.getFilteredHistory();

    try {
      this.renderContentInternal(history);
    } catch (error) {
      console.error('[Bark Push] Error rendering history tab:', error);
      this.containerElement.innerHTML = `<div class="history-error">Error rendering history: ${error}</div>`;
    }
  }

  /**
   * Internal render logic
   */
  private renderContentInternal(history: PushHistoryItem[]): void {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'history-header';

    const title = document.createElement('h3');
    title.textContent = t('history.title');
    title.className = 'history-title';
    header.appendChild(title);

    const recordCount = document.createElement('span');
    recordCount.className = 'history-count';
    recordCount.textContent = t('history.recordsTotal', { count: String(this.storage.getPushHistory().length) });
    header.appendChild(recordCount);

    this.containerElement.appendChild(header);

    // Filter input
    const filterContainer = document.createElement('div');
    filterContainer.className = 'history-filter';

    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.className = 'form-input';
    filterInput.placeholder = t('history.filterPlaceholder');
    filterInput.value = this.filterText;

    filterInput.addEventListener('input', () => {
      this.filterText = filterInput.value;
      this.renderContent();
    });

    filterContainer.appendChild(filterInput);
    this.containerElement.appendChild(filterContainer);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'history-actions';

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'btn btn-secondary';
    exportBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z" fill="currentColor"></path></svg>';
    exportBtn.title = t('history.actions.export');
    exportBtn.addEventListener('click', () => this.handleExport());
    actions.appendChild(exportBtn);

    // Import button
    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'btn btn-secondary';
    importBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 20h14v-2H5zm0-10h4v6h6v-6h4l-7-7z" fill="currentColor"></path></svg>';
    importBtn.title = t('history.actions.import');
    importBtn.addEventListener('click', () => this.handleImport());
    actions.appendChild(importBtn);

    // Delete selected button
    const deleteSelectedBtn = document.createElement('button');
    deleteSelectedBtn.type = 'button';
    deleteSelectedBtn.className = 'btn btn-danger';
    deleteSelectedBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z" fill="currentColor"></path></svg>';
    deleteSelectedBtn.title = t('history.actions.delete');
    deleteSelectedBtn.style.display = this.selectedIds.size > 0 ? 'flex' : 'none';
    deleteSelectedBtn.addEventListener('click', () => this.handleDeleteSelected());
    actions.appendChild(deleteSelectedBtn);

    this.containerElement.appendChild(actions);

    // History table or empty state
    if (history.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'history-empty';

      const emptyText = document.createElement('p');
      emptyText.textContent = t('history.noHistory');
      emptyState.appendChild(emptyText);

      const emptyHint = document.createElement('p');
      emptyHint.className = 'hint';
      emptyHint.textContent = t('history.noHistoryHint');
      emptyState.appendChild(emptyHint);

      this.containerElement.appendChild(emptyState);
    } else {
      const table = this.createTable(history);
      this.containerElement.appendChild(table);
    }
  }

  /**
   * Get filtered history items
   */
  private getFilteredHistory(): PushHistoryItem[] {
    const history = this.storage.getPushHistory();
    if (!this.filterText) return history;

    const filter = this.filterText.toLowerCase();
    return history.filter(item => {
      // Filter by content
      if (item.content.toLowerCase().includes(filter)) return true;
      if (item.title?.toLowerCase().includes(filter)) return true;

      // Filter by device name
      for (const device of item.devices) {
        if (device.name?.toLowerCase().includes(filter)) return true;
      }

      return false;
    });
  }

  /**
   * Create the history table
   */
  private createTable(history: PushHistoryItem[]): HTMLElement {
    const container = document.createElement('div');
    container.className = 'history-table-container';

    const table = document.createElement('table');
    table.className = 'history-table';

    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'history-table-row header';

    // Checkbox column
    const selectHeader = document.createElement('th');
    selectHeader.className = 'history-table-cell checkbox';
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.checked = this.selectedIds.size === history.length && history.length > 0;
    selectAllCheckbox.addEventListener('change', () => {
      if (selectAllCheckbox.checked) {
        history.forEach(item => this.selectedIds.add(item.id));
      } else {
        this.selectedIds.clear();
      }
      this.renderContent();
    });
    selectHeader.appendChild(selectAllCheckbox);
    headerRow.appendChild(selectHeader);

    // Time column
    const timeHeader = document.createElement('th');
    timeHeader.className = 'history-table-cell time';
    timeHeader.textContent = t('history.columns.time');
    this.addResizer(timeHeader, 'time');
    headerRow.appendChild(timeHeader);

    // Content column
    const contentHeader = document.createElement('th');
    contentHeader.className = 'history-table-cell content';
    contentHeader.textContent = t('history.columns.content');
    this.addResizer(contentHeader, 'content');
    headerRow.appendChild(contentHeader);

    // Status column
    const statusHeader = document.createElement('th');
    statusHeader.className = 'history-table-cell status';
    statusHeader.textContent = t('history.columns.status');
    this.addResizer(statusHeader, 'status');
    headerRow.appendChild(statusHeader);

    // Device column
    const deviceHeader = document.createElement('th');
    deviceHeader.className = 'history-table-cell device';
    deviceHeader.textContent = t('history.columns.device');
    this.addResizer(deviceHeader, 'device');
    headerRow.appendChild(deviceHeader);

    // Actions column
    const actionsHeader = document.createElement('th');
    actionsHeader.className = 'history-table-cell actions';
    actionsHeader.textContent = t('history.columns.actions');
    headerRow.appendChild(actionsHeader);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    history.forEach(item => {
      const row = document.createElement('tr');
      row.className = 'history-table-row';

      // Checkbox
      const selectCell = document.createElement('td');
      selectCell.className = 'history-table-cell checkbox';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.selectedIds.has(item.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedIds.add(item.id);
        } else {
          this.selectedIds.delete(item.id);
        }
        this.renderContent();
      });
      selectCell.appendChild(checkbox);
      row.appendChild(selectCell);

      // Time
      const timeCell = document.createElement('td');
      timeCell.className = 'history-table-cell time';
      timeCell.textContent = this.formatTime(item.requestTimestamp, item.timezone);
      row.appendChild(timeCell);

      // Content
      const contentCell = document.createElement('td');
      contentCell.className = 'history-table-cell content';
      const contentText = item.title ? `${item.title}: ${item.content}` : item.content;
      contentCell.textContent = this.truncateText(contentText, 50);
      contentCell.title = contentText;
      row.appendChild(contentCell);

      // Status
      const statusCell = document.createElement('td');
      statusCell.className = `history-table-cell status ${this.getItemStatus(item)}`;
      statusCell.textContent = t(`history.status.${this.getItemStatus(item)}`);
      row.appendChild(statusCell);

      // Device
      const deviceCell = document.createElement('td');
      deviceCell.className = 'history-table-cell device';
      deviceCell.textContent = item.devices.map(d => d.name || d.id).join(', ');
      deviceCell.title = item.devices.map(d => d.apiUrl).join('\n');
      row.appendChild(deviceCell);

      // Actions
      const actionsCell = document.createElement('td');
      actionsCell.className = 'history-table-cell actions';

      // Recall button (only for sent items)
      if (this.getItemStatus(item) === 'sent') {
        const recallBtn = document.createElement('button');
        recallBtn.type = 'button';
        recallBtn.className = 'history-action-btn';
        recallBtn.title = t('history.recall');
        recallBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8"></path></svg>';
        recallBtn.addEventListener('click', () => this.handleRecall(item));
        actionsCell.appendChild(recallBtn);
      }

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'history-action-btn delete';
      deleteBtn.title = t('history.delete');
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"></path></svg>';
      deleteBtn.addEventListener('click', () => this.handleDelete(item.id));
      actionsCell.appendChild(deleteBtn);

      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  }

  /**
   * Get item status
   */
  private getItemStatus(item: PushHistoryItem): 'sent' | 'failed' | 'recalled' {
    if (item.status === 'recalled') return 'recalled';
    const hasError = item.responseJson.some(r => r.code !== 200);
    return hasError ? 'failed' : 'sent';
  }

  /**
   * Format timestamp
   */
  private formatTime(timestamp: number, timezone: string): string {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    // Only add timeZone if it's a valid string
    if (timezone && typeof timezone === 'string') {
      options.timeZone = timezone;
    }
    return date.toLocaleString(undefined, options);
  }

  /**
   * Truncate text
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Add resize handle to a column header
   */
  private addResizer(header: HTMLElement, columnClass: string): void {
    const resizer = document.createElement('div');
    resizer.className = 'history-resizer';
    resizer.dataset.column = columnClass;

    let startX = 0;
    let startWidth = 0;
    let isResizing = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + dx);
      // Find all cells in this column
      const cells = this.containerElement?.querySelectorAll(`.history-table-cell.${columnClass}`);
      cells?.forEach((cell) => {
        (cell as HTMLElement).style.width = `${newWidth}px`;
        (cell as HTMLElement).style.minWidth = `${newWidth}px`;
      });
    };

    const onMouseUp = () => {
      isResizing = false;
      resizer.classList.remove('resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      resizer.classList.add('resizing');
      const firstCell = this.containerElement?.querySelector(`.history-table-cell.${columnClass}`) as HTMLElement;
      startWidth = firstCell?.offsetWidth || 150;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    header.appendChild(resizer);
  }

  /**
   * Handle export
   */
  private handleExport(): void {
    const history = this.storage.getPushHistory();
    const now = new Date();

    // Format: 20260221T223000+0800
    const formatDate = (d: Date): string => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const offset = -d.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const hh = pad(Math.floor(Math.abs(offset) / 60));
      const mm = pad(Math.abs(offset) % 60);
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${sign}${hh}${mm}`;
    };

    const exportData = {
      version: 1,
      exportedAt: now.toISOString(),
      records: history,
    };

    const filename = `bark-push-history-${formatDate(now)}.json`;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    this.toast.show(t('history.exportSuccess'), 'success');
  }

  /**
   * Handle import
   */
  private async handleImport(): Promise<void> {
    // Create hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate import format
        if (!data.version || !data.records || !Array.isArray(data.records)) {
          throw new Error('Invalid format');
        }

        const records = data.records as PushHistoryItem[];
        const count = records.length;

        // Merge with existing history
        const existingHistory = this.storage.getPushHistory();
        const existingIds = new Set(existingHistory.map(h => h.id));

        for (const record of records) {
          if (!existingIds.has(record.id)) {
            existingHistory.unshift(record);
          }
        }

        // Trim to max size
        const MAX_HISTORY_SIZE = 500;
        if (existingHistory.length > MAX_HISTORY_SIZE) {
          existingHistory.length = MAX_HISTORY_SIZE;
        }

        // Save to storage
        // Note: We need to add a method to set history directly or use a different approach
        // For now, we'll add each item individually
        for (const record of records) {
          if (!existingIds.has(record.id)) {
            this.storage.addPushHistoryItem(record);
          }
        }

        this.toast.show(t('history.importSuccess', { count: String(count) }), 'success');
        this.renderContent();

      } catch (error) {
        this.toast.show(t('history.importFailed'), 'error');
      }
    };

    input.click();
  }

  /**
   * Handle delete single item
   */
  private handleDelete(id: string): void {
    this.storage.deletePushHistoryItems([id]);
    this.selectedIds.delete(id);
    this.renderContent();
  }

  /**
   * Handle delete selected items
   */
  private handleDeleteSelected(): void {
    const count = this.selectedIds.size;
    if (count === 0) return;

    this.storage.deletePushHistoryItems([...this.selectedIds]);
    this.selectedIds.clear();
    this.toast.show(t('history.deleteSuccess', { count: String(count) }), 'success');
    this.renderContent();
  }

  /**
   * Handle recall
   */
  private async handleRecall(item: PushHistoryItem): Promise<void> {
    try {
      // Recall from each device
      for (const deviceInfo of item.devices) {
        const devices = this.storage.getDevices();
        const device = devices.find(d => d.id === deviceInfo.id);

        if (device) {
          // Build recall payload with all original fields
          const recallPayload: NotificationPayload = {
            title: item.title,
            body: item.markdownEnabled ? undefined : item.content,
            markdown: item.markdownEnabled ? item.content : undefined,
          };

          // Add all options, converting boolean to string where needed
          if (item.options) {
            if (item.options.sound) recallPayload.sound = item.options.sound;
            if (item.options.icon) recallPayload.icon = item.options.icon;
            if (item.options.group) recallPayload.group = item.options.group;
            if (item.options.url) recallPayload.url = item.options.url;
            if (item.options.autoCopy) recallPayload.autoCopy = item.options.autoCopy;
            if (item.options.isArchive) recallPayload.isArchive = '1';
            if (item.options.subtitle) recallPayload.subtitle = item.options.subtitle;
            if (item.options.badge !== undefined) recallPayload.badge = item.options.badge;
            if (item.options.level) recallPayload.level = item.options.level as 'active' | 'critical' | 'timeSensitive' | 'passive';
            if (item.options.volume !== undefined) recallPayload.volume = item.options.volume;
            if (item.options.call) recallPayload.call = item.options.call ? '1' : undefined;
            if (item.options.copy) recallPayload.copy = item.options.copy;
            if (item.options.action) recallPayload.action = item.options.action;
            if (item.options.image) recallPayload.image = item.options.image;
          }

          await this.barkClient.recallNotification(device, item.id, recallPayload);
        }
      }

      // Update history item status to recalled
      this.storage.updatePushHistoryItem(item.id, { status: 'recalled' });

      this.toast.show(t('history.recallSuccess'), 'success');
      this.renderContent();

    } catch (error) {
      this.toast.show(t('history.recallFailed'), 'error');
    }
  }

  /**
   * Refresh the tab
   */
  refresh(): void {
    this.selectedIds.clear();
    this.filterText = '';
    this.renderContent();
  }

  /**
   * Destroy the tab
   */
  destroy(): void {
    this.containerElement = null;
  }
}
