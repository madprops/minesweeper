const App = {}
App.level = `normal`

App.init = () => {
  let style = getComputedStyle(document.body)
  App.size = parseInt(style.getPropertyValue(`--size`))
  App.main_el = DOM.el(`#main`)
  App.grid_el = DOM.el(`#grid`)
  App.mines_el = DOM.el(`#mines`)
  App.time_el = DOM.el(`#time`)
  App.levels_el = DOM.el(`#levels`)
  App.explosion_fx = DOM.el(`#audio_explosion`)
  App.click_fx = DOM.el(`#audio_click`)
  App.victory_fx = DOM.el(`#audio_victory`)
  App.start_fx = DOM.el(`#audio_start`)
  App.face_el = DOM.el(`#face`)
  App.start_events()
  App.start_info()
  App.start_levels()
  App.prepare_game()
}

App.start_events = () => {
  DOM.ev(App.grid_el, `contextmenu`, (e) => {
    e.preventDefault()
  })

  DOM.ev(document, `visibilitychange`, () => {
      if (document.hidden) {
        App.pause()
      }
    },
  )

  DOM.ev(App.grid_el, `mousedown`, () => {
    App.change_face(`pressing`)
  })

  DOM.ev(App.grid_el, `mouseup`, () => {
    App.change_face(`waiting`)
  })

  DOM.ev(document, `keyup`, (e) => {
    if (e.key === `Enter`) {
      App.ask_restart()
    }
    else if (e.key === ` `) {
      App.toggle_pause()
    }
  })
}

App.change_face = (s, force = false) => {
  if (!force && App.over) {
    return
  }

  App.face_el.src = `img/face_${s}.png`
}

App.prepare_game = () => {
  App.game_started = false
  App.check_level()
  App.over = false
  App.num_revealed = 0
  App.num_clicks = 0
  App.main_el.classList.remove(`boom`)
  App.playing = true
  App.num_mines = App.initial_mines
  App.create_grid()
  clearInterval(App.time_interval)
  App.time = 0
  App.update_info()
  App.change_face(`waiting`)
}

App.create_grid = () => {
  App.grid_el.innerHTML = ``
  App.grid = []
  let size = App.size / App.grid_size
  let x = 0
  let y = 0
  let row = []

  for (let xx = 0; xx < App.grid_size; xx++) {
    for (let yy = 0; yy < App.grid_size; yy++) {
      let block = document.createElement(`div`)
      block.style.width = size + `px`
      block.style.height = size + `px`
      block.style.left = x + `px`
      block.style.top = y + `px`
      block.classList.add(`block`)

      DOM.ev(block, `click`, () => {
        App.onclick(xx, yy)
      })

      DOM.ev(block, `contextmenu`, (e) => {
        App.flag(xx, yy)
        e.preventDefault()
      })

      App.grid_el.append(block)
      let item = {}
      item.x = xx
      item.y = yy
      item.block = block
      item.revealed = false
      row.push(item)
      x += size
    }

    App.grid.push(row)
    row = []
    x = 0
    y += size
  }
}

App.shuffle = (arr) => {
  if (arr.length === 1) {
    return arr
  }

  const rand = Math.floor(Math.random() * arr.length)
  return [arr[rand], ...App.shuffle(arr.filter((_, i) => i != rand))]
}

App.start_game = (x, y) => {
  if (App.game_started) {
    return
  }

  let pairs = []

  for (let xx = 0; xx < App.grid_size; xx++) {
    for (let yy = 0; yy < App.grid_size; yy++) {
      if (xx === x && yy === y) {
        continue
      }

      if (xx >= x - 1 && xx <= x + 1) {
        if (yy >= y - 1 && yy <= y + 1) {
          continue
        }
      }

      pairs.push([xx, yy])
    }
  }

  let num = 0

  for (let p of App.shuffle(pairs)) {
    let item = App.grid[p[0]][p[1]]
    item.mine = true
    item.block.classList.add(`mine`)
    num += 1

    if (num >= App.num_mines) {
      break
    }
  }

  App.game_started = true
  App.check_mines()
  App.start_time()
  App.playsound(App.start_fx)
}

App.check_mines = () => {
  for (let x = 0; x < App.grid_size; x++) {
    for (let y = 0; y < App.grid_size; y++) {
      let number = 0

      if (y > 0) {
        if (App.grid[x][y - 1].mine) {
          number += 1
        }

        if (x > 0) {
          if (App.grid[x - 1][y - 1].mine) {
            number += 1
          }
        }

        if (x < App.grid_size - 1) {
          if (App.grid[x + 1][y - 1].mine) {
            number += 1
          }
        }
      }

      if (x > 0) {
        if (App.grid[x - 1][y].mine) {
          number += 1
        }
      }

      if (x < App.grid_size - 1) {
        if (App.grid[x + 1][y].mine) {
          number += 1
        }
      }

      if (y < App.grid_size - 1) {
        if (App.grid[x][y + 1].mine) {
          number += 1
        }

        if (x > 0) {
          if (App.grid[x - 1][y + 1].mine) {
            number += 1
          }
        }

        if (x < App.grid_size - 1) {
          if (App.grid[x + 1][y + 1].mine) {
            number += 1
          }
        }
      }

      let item = App.grid[x][y]
      item.number = number
      let text = document.createElement(`div`)
      text.classList.add(`number`)

      if (item.mine) {
        text.textContent = `💣️`
      }
      else if (number > 0) {
        text.textContent = number
      }

      item.og_number = text.textContent
      item.block.append(text)
    }
  }
}

App.random_int = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

App.onclick = (x, y) => {
  if (App.over) {
    return
  }

  if (!App.playing) {
    App.unpause()
  }

  App.start_game(x, y)
  let item = App.grid[x][y]

  if (item.revealed) {
    return
  }

  App.num_clicks += 1

  if (item.mine) {
    item.block.classList.add(`minehit`)
    App.gameover(`explosion`)
    return
  }
  else {
    if (item.revealed) {
      return
    }

    App.floodfill(x, y)
  }

  if (!App.check_status()) {
    App.playsound(App.click_fx)
  }
}

App.setnumber = (item, s) => {
  DOM.el(`.number`, item.block).textContent = s
}

App.gameover = (mode) => {
  App.over = true
  App.playing = false

  for (let row of App.grid) {
    for (let item of row) {
      if (item.mine) {
        item.block.classList.add(`flag`)
        App.setnumber(item, item.og_number)
      }
    }
  }

  if (mode === `won`) {
    App.mines_el.textContent = `You cleared all the mines!`
    App.playsound(App.victory_fx)
    App.change_face(`won`, true)
  }
  else if (mode === `explosion`) {
    App.mines_el.textContent = `You stepped on a mine!`
    App.playsound(App.explosion_fx)
    App.change_face(`lost`, true)
  }
  else if (mode === `timeout`) {
    App.mines_el.textContent = `You ran out of time!`
    App.playsound(App.explosion_fx)
    App.change_face(`lost`, true)
  }

  if (mode !== `won`) {
    App.main_el.classList.add(`boom`)
  }
}

App.floodfill = (x, y) => {
  let item = App.grid[x][y]

  if (item.number > 0) {
    App.reveal(x, y)
    return
  }

  App.fill(x, y)
}

App.fill = (x, y) => {
  if (x < 0) {
    return
  }

  if (y < 0) {
    return
  }

  if (x > App.grid.length - 1) {
    return
  }

  if (y > App.grid[x].length - 1) {
    return
  }

  let item = App.grid[x][y]

  if (item.revealed) {
    return
  }

  let cont = item.number === 0

  if (!item.revealed) {
    App.reveal(x, y)
  }

  if (cont) {
    App.fill(x - 1, y)
    App.fill(x + 1, y)
    App.fill(x, y - 1)
    App.fill(x, y + 1)
    App.fill(x - 1, y + 1)
    App.fill(x + 1, y - 1)
    App.fill(x + 1, y + 1)
    App.fill(x - 1, y - 1)
  }
}

App.reveal = (x, y) => {
  let item = App.grid[x][y]

  if (item.flag) {
    App.flag(x, y)
  }

  item.block.classList.add(`revealed`)
  item.revealed = true
  App.num_revealed += 1
}

App.flag = (x, y) => {
  if (App.over) {
    return
  }

  if (!App.playing) {
    App.unpause()
  }

  App.start_game(x, y)
  let item = App.grid[x][y]

  if (item.revealed) {
    return
  }

  item.flag = !item.flag

  if (item.flag) {
    item.block.classList.add(`flag`)
    App.setnumber(item, `⚑`)
    App.num_mines -= 1
  }
  else {
    item.block.classList.remove(`flag`)
    App.setnumber(item, item.og_number)
    App.num_mines += 1
  }

  App.update_mines()
}

App.update_mines = () => {
  let s

  if (App.num_mines === 1) {
    s = `mines`
  }
  else {
    s = `mines`
  }

  App.mines_el.textContent = `${App.num_mines} / ${App.initial_mines} ${s} (${App.grid_size} x ${App.grid_size})`
}

App.start_info = () => {
  DOM.ev(App.face_el, `click`, () => {
    App.ask_restart()
  })

  DOM.ev(App.time_el, `click`, () => {
    App.toggle_pause()
  })
}

App.update_info = () => {
  App.update_mines()
  App.update_time()
}

App.timestring = (n) => {
  return n.toString().padStart(3, `0`)
}

App.update_time = () => {
  App.time_el.textContent = `Time: ` + App.timestring(App.time) + ` / ` + App.timestring(App.max_time)
}

App.start_time = () => {
  clearInterval(App.time_interval)

  App.time_interval = setInterval(() => {
    if (App.playing) {
      App.time += 1
      App.update_time()

      if (App.time >= App.max_time) {
        App.gameover(`timeout`)
      }
    }
  }, 1000)
}

App.check_status = () => {
  if (App.num_revealed == (App.grid_size * App.grid_size) - App.initial_mines) {
    App.gameover(`won`)
    return true
  }

  return false
}

App.playsound = (el) => {
  el.pause()
  el.currentTime = 0
  el.play()
}

App.toggle_pause = () => {
  if (App.playing) {
    App.pause()
  }
  else {
    App.unpause()
  }
}

App.pause = () => {
  if (App.over) {
    return
  }

  if (!App.game_started) {
    return
  }

  if (!App.playing) {
    return
  }

  App.playing = false
  App.time_el.textContent += ` (Paused)`
}

App.unpause = () => {
  if (App.over) {
    return
  }

  if (App.playing) {
    return
  }

  App.playing = true
  App.update_time()
}

App.start_levels = () => {
  DOM.ev(App.levels_el, `click`, (e) => {
    let level = e.target.dataset.level

    if (level) {
      if (level === App.level) {
        App.ask_restart()
        return
      }

      for (let div of DOM.els(`div`, App.levels_el)) {
        div.classList.remove(`level_selected`)

        if (div.dataset.level === level) {
          div.classList.add(`level_selected`)
        }
        else {
          div.classList.remove(`level_selected`)
        }
      }

      App.level = level
      App.ask_restart()
    }
  })
}

App.check_level = () => {
  if (App.level === `easy`) {
    App.initial_mines = 10
    App.grid_size = 10
    App.max_time = 100

  }
  else if (App.level === `normal`) {
    App.initial_mines = 30
    App.grid_size = 15
    App.max_time = 300

  }
  else if (App.level === `hard`) {
    App.initial_mines = 60
    App.grid_size = 20
    App.max_time = 600

  }
  else if (App.level === `expert`) {
    App.initial_mines = 80
    App.grid_size = 20
    App.max_time = 300
  }
}

App.ask_restart = () => {
  if (!App.over) {
    if (App.num_clicks > 1) {
      if (confirm(`Restart Game?`)) {
        App.prepare_game()
      }

      return
    }
  }

  App.prepare_game()
}