<template>
  <div
    v-if="visible"
    class="upload-top-progress"
    :class="{ open: panelOpen }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <div class="upload-hit">
      <div class="upload-track">
        <div
          class="upload-bar"
          :style="{ width: overallPercent + '%', backgroundColor: '#1890ff' }"
        />
      </div>
    </div>
    <div v-if="panelOpen" class="upload-tooltip">
      <div class="upload-tooltip-header">
        <span>{{ batchTitle }}</span>
        <button
          v-if="runningBatches.length"
          type="button"
          class="btn-cancel"
          @click.stop="cancelAll"
        >{{ $t('ws.upload_cancel_all') }}</button>
      </div>

      <div
        v-for="b in runningBatches"
        :key="b.id"
        class="batch-block"
      >
        <div class="batch-block-header">
          <span class="batch-label">
            {{ $t('ws.upload_batch_n', { n: b.index }) }}
            <span class="batch-count">{{ b.done }}/{{ b.total }}</span>
          </span>
          <button
            type="button"
            class="btn-cancel"
            @click.stop="cancelBatch(b.id)"
          >{{ $t('ws.upload_cancel') }}</button>
        </div>
        <div v-if="b.activeItems && b.activeItems.length" class="active-list">
          <div
            v-for="item in b.activeItems"
            :key="item.uid"
            class="upload-tooltip-row"
          >
            <span class="dot" :style="{ backgroundColor: item.color || '#1890ff' }" />
            <span class="name" :title="item.name">{{ item.name }}</span>
            <span class="meta">{{ item.percent }}%</span>
          </div>
        </div>
        <div v-else class="upload-tooltip-empty">
          {{ $t('ws.upload_waiting') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
let batchSeq = 0

export default {
  name: 'UploadTopProgress',
  data () {
    return {
      panelOpen: false,
      leaveTimer: null,
      // id -> { id, index, total, done, failed, finished, cancelFn, activeItems }
      batches: {},
      rafId: null,
      pendingPatch: null,
    }
  },
  computed: {
    batchList () {
      return Object.keys(this.batches).map(id => this.batches[id])
    },
    runningBatches () {
      return this.batchList.filter(b => !b.finished)
    },
    visible () {
      return this.batchList.length > 0
    },
    totalAll () {
      return this.batchList.reduce((s, b) => s + (b.total || 0), 0)
    },
    doneAll () {
      return this.batchList.reduce((s, b) => s + (b.done || 0), 0)
    },
    mergedActive () {
      const list = []
      this.runningBatches.forEach(b => {
        if (b.activeItems && b.activeItems.length) {
          list.push(...b.activeItems)
        }
      })
      return list
    },
    overallPercent () {
      if (!this.totalAll) return 0
      const activeSum = this.mergedActive.reduce((s, it) => s + (it.percent || 0) / 100, 0)
      const p = ((this.doneAll + activeSum) / this.totalAll) * 100
      return Math.max(0, Math.min(99, Math.round(p)))
    },
    batchTitle () {
      return this.$t('ws.upload_batch_progress', {
        done: this.doneAll,
        total: this.totalAll,
      })
    },
  },
  beforeDestroy () {
    this.clearLeaveTimer()
    if (this.rafId) cancelAnimationFrame(this.rafId)
  },
  methods: {
    clearLeaveTimer () {
      if (this.leaveTimer) {
        clearTimeout(this.leaveTimer)
        this.leaveTimer = null
      }
    },
    onEnter () {
      this.clearLeaveTimer()
      this.panelOpen = true
    },
    onLeave () {
      this.clearLeaveTimer()
      this.leaveTimer = setTimeout(() => {
        this.panelOpen = false
        this.leaveTimer = null
      }, 280)
    },
    /**
     * Add a batch without clearing other running uploads.
     * @param {{ total: number, onCancel: Function }} opts
     */
    startBatch ({ total, onCancel }) {
      const index = ++batchSeq
      const id = `b${index}`
      this.$set(this.batches, id, {
        id,
        index,
        total: total || 0,
        done: 0,
        failed: 0,
        finished: false,
        cancelFn: typeof onCancel === 'function' ? onCancel : null,
        activeItems: [],
      })

      return {
        setActive: (items) => {
          this.queuePatch(id, { activeItems: items || [] })
        },
        tickDone: () => {
          this.queuePatch(id, { doneInc: 1 })
        },
        tickFail: () => {
          this.queuePatch(id, { doneInc: 1, failInc: 1 })
        },
        finish: () => {
          this.finishBatch(id)
        },
      }
    },
    finishBatch (id) {
      this.flushPending()
      const b = this.batches[id]
      if (!b || b.finished) return
      b.finished = true
      b.activeItems = []
      b.cancelFn = null
      setTimeout(() => {
        const cur = this.batches[id]
        if (cur && cur.finished) {
          this.$delete(this.batches, id)
        }
      }, 600)
    },
    queuePatch (id, patch) {
      if (!this.pendingPatch) this.pendingPatch = {}
      if (!this.pendingPatch[id]) {
        this.pendingPatch[id] = { doneInc: 0, failInc: 0, activeItems: undefined }
      }
      const p = this.pendingPatch[id]
      if (patch.doneInc) p.doneInc += patch.doneInc
      if (patch.failInc) p.failInc += patch.failInc
      if (patch.activeItems !== undefined) p.activeItems = patch.activeItems
      this.scheduleFlush()
    },
    scheduleFlush () {
      if (this.rafId) return
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null
        this.flushPending()
      })
    },
    flushPending () {
      if (!this.pendingPatch) return
      const patches = this.pendingPatch
      this.pendingPatch = null
      Object.keys(patches).forEach(id => {
        const b = this.batches[id]
        if (!b || b.finished) return
        const p = patches[id]
        if (p.doneInc || p.failInc) {
          b.done += p.doneInc
          b.failed += p.failInc
        }
        if (p.activeItems !== undefined) {
          b.activeItems = p.activeItems
        }
      })
    },
    cancelBatch (id) {
      this.clearLeaveTimer()
      this.panelOpen = true
      this.flushPending()
      const b = this.batches[id]
      if (!b || b.finished) return
      const fn = b.cancelFn
      b.cancelFn = null
      b.finished = true
      b.activeItems = []
      if (fn) {
        try {
          fn()
        } catch (e) {
          // ignore
        }
      }
      this.$delete(this.batches, id)
      if (this.pendingPatch) {
        delete this.pendingPatch[id]
      }
    },
    cancelAll () {
      this.clearLeaveTimer()
      this.panelOpen = true
      this.flushPending()
      const ids = Object.keys(this.batches)
      ids.forEach(id => {
        const b = this.batches[id]
        if (!b || b.finished) return
        const fn = b.cancelFn
        b.cancelFn = null
        b.finished = true
        b.activeItems = []
        if (fn) {
          try {
            fn()
          } catch (e) {
            // ignore
          }
        }
      })
      this.batches = {}
      this.pendingPatch = null
    },
  },
}
</script>

<style lang="scss" scoped>
.upload-top-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  pointer-events: none;

  &.open,
  &:hover {
    pointer-events: auto;
  }
}

.upload-hit {
  position: relative;
  height: 28px;
  pointer-events: auto;
}

.upload-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.upload-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  opacity: 0.9;
  transition: width 0.12s linear;
}

.upload-tooltip {
  position: absolute;
  top: 10px;
  left: 8px;
  width: 460px;
  max-height: 360px;
  overflow-y: auto;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.88);
  color: #fff;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  pointer-events: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.upload-tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
}

.batch-block {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.batch-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.batch-label {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;

  .batch-count {
    margin-left: 8px;
    color: rgba(255, 255, 255, 0.65);
    font-weight: 400;
  }
}

.upload-tooltip-empty {
  color: rgba(255, 255, 255, 0.65);
  padding: 4px 0;
}

.upload-tooltip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 26px;
  padding: 2px 0;

  .dot {
    flex: 0 0 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    flex: 0 0 auto;
    color: rgba(255, 255, 255, 0.75);
    white-space: nowrap;
  }
}

.btn-cancel {
  flex: 0 0 auto;
  margin: 0;
  padding: 2px 10px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.55);
    color: #fff;
  }
}
</style>
