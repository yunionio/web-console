<template>
  <div class="error-container">
    <h1>404</h1>
    <p>页面不存在</p>
  </div>
</template>

<script>
export default {
  name: 'Error'
}
</script>

<style lang="less" scoped>
.error-container {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  color: #fff !important;
  // text-align: center;
  padding-top: 20px;
  padding-left: 20px;
  h1 {
    color: #fff !important;
  }
}
</style>
