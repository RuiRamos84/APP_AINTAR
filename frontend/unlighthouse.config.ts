export default {
  site: 'https://app.aintar.pt',
  hooks: {
    async authenticate(page) {
      await page.goto('https://app.aintar.pt')
      
      await page.evaluate(() => {
        localStorage.setItem('access_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NDQ1OTUxMSwianRpIjoiZTI3NmJmOWQtZDc0MS00MDcyLWE1M2UtNjUxYmE3Y2VhMzkzIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjEyNzg1IiwibmJmIjoxNzY0NDU5NTExLCJjc3JmIjoiZTc5Y2Y1NmUtMGIxMy00MTc1LWE2NWQtY2JkYzdhMTY5NWMwIiwiZXhwIjoxNzY0NDYzMTExLCJzZXNzaW9uX2lkIjoiMTI3ODUiLCJ1c2VyX2lkIjo4MiwicHJvZmlsIjoiMCIsImVudGl0eSI6MSwiaW50ZXJmYWNlcyI6WzExMCw0MCwxMCw3MCw1MCw2MCw4MCwzMCw5MCwxMDAsMjAsNDAwLDU2MCw1NDAsNTMwLDUwMCw1MjAsNTEwLDgxMCw4MjAsODAwLDIxMCwzMjAsMzAwLDIyMCw2MDAsNzIwLDczMCw3MDAsNzEwLDc0MCwyMDAsNzUwLDMxMCwzMTQsMzExLDMxMywzMTJdLCJ1c2VyX25hbWUiOiJSdWkgUmFtb3MiLCJjcmVhdGVkX2F0IjoxNzY0NDU5NTExLjM3NDU4MSwibGFzdF9hY3Rpdml0eSI6MTc2NDQ1OTUxMS4zNzQ1ODEsInRva2VuX3R5cGUiOiJhY2Nlc3MifQ.5eO4evbJmJCFYpaoE0j4-qaTXD_6ZcJO0Y0yk8i0ONQ')
      })
      
      await page.reload()
    }
  }
}