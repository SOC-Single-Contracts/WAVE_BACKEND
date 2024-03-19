
async function loadTronWeb() {
    let TronWeb;
    try {
      // Try to dynamically import TronWeb
      const module = await import('tronweb');
      TronWeb = module.default || module;
    } catch (error) {
      // Log the error if import fails
      console.error('Error importing TronWeb:', error);
      throw error;
    }
    return TronWeb;
  }
  
  module.exports = loadTronWeb;