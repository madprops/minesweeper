const Mine = {}
Mine.level = 'normal'

Mine.init = function () {
  let style = getComputedStyle(document.body)
  Mine.size = parseInt(style.getPropertyValue('--size'))
  Mine.main_el = document.querySelector('#main')
  Mine.grid_el = document.querySelector('#grid')
  Mine.bombs_el = document.querySelector('#bombs')
  Mine.time_el = document.querySelector('#time')
  Mine.levels_el = document.querySelector('#levels')
  Mine.explosion_fx = document.querySelector('#audio_explosion')
  Mine.click_fx = document.querySelector('#audio_click')
  Mine.victory_fx = document.querySelector('#audio_victory')
  Mine.start_fx = document.querySelector('#audio_start')
  Mine.grid_el.addEventListener('contextmenu', function (e) {
    e.preventDefault()
  })

  document.addEventListener(
    "visibilitychange",
    function () {
      if (document.hidden) {
        Mine.pause()
      }
    },
    false
  )

  Mine.start_info()
  Mine.start_levels()
  Mine.prepare_game()
}

Mine.prepare_game = function () {
  Mine.game_started = false
  Mine.check_level()
  Mine.over = false
  Mine.num_revealed = 0
  Mine.num_clicks = 0
  Mine.main_el.classList.remove('boom')
  Mine.playing = true
  Mine.num_bombs = Mine.initial_bombs
  Mine.create_grid()
  clearInterval(Mine.time_interval)
  Mine.time = 0
  Mine.update_info()
}

Mine.create_grid = function () {
  Mine.grid_el.innerHTML = ''
  Mine.grid = []
  let size = Mine.size / Mine.grid_size
  let x = 0
  let y = 0
  let row = []

  for (let xx = 0; xx < Mine.grid_size; xx++) {
    for (let yy = 0; yy < Mine.grid_size; yy++) {
      let block = document.createElement('div')
      block.style.width = size + 'px'
      block.style.height = size + 'px'
      block.style.left = x + 'px'
      block.style.top = y + 'px'
      block.classList.add('block')

      block.addEventListener('click', function () {
        Mine.onclick(xx, yy)
      })

      block.addEventListener('contextmenu', function (e) {
        Mine.flag(xx, yy)
        e.preventDefault()
      })

      Mine.grid_el.append(block)

      let item = {}
      item.block = block
      item.revealed = false
      row.push(item)

      x += size
    }

    Mine.grid.push(row)
    row = []

    x = 0
    y += size
  }
}

Mine.shuffle = function (arr) {
  if (arr.length === 1) {
    return arr
  }
  const rand = Math.floor(Math.random() * arr.length)
  return [arr[rand], ...Mine.shuffle(arr.filter((_, i) => i != rand))]
}

Mine.start_game = function (x, y) {
  if (Mine.game_started) return

  let pairs = []
  for (let x = 0; x < Mine.grid_size; x++) {
    for (let y = 0; y < Mine.grid_size; y++) {
      pairs.push([x, y])
    }
  }

  let num = 0

  for (let p of Mine.shuffle(pairs)) {
    if (p[0] === x && p[1] === y) continue
    let item = Mine.grid[p[0]][p[1]]
    item.bomb = true
    item.block.classList.add('bomb')
    num += 1
    if (num >= Mine.num_bombs) break
  }

  Mine.game_started = true
  Mine.check_bombs()
  Mine.start_time()
  Mine.playsound(Mine.start_fx)
}

Mine.check_bombs = function () {
  for (let x = 0; x < Mine.grid_size; x++) {
    for (let y = 0; y < Mine.grid_size; y++) {
      let number = 0

      if (y > 0) {
        if (Mine.grid[x][y - 1].bomb) {
          number += 1
        }

        if (x > 0) {
          if (Mine.grid[x - 1][y - 1].bomb) {
            number += 1
          }
        }

        if (x < Mine.grid_size - 1) {
          if (Mine.grid[x + 1][y - 1].bomb) {
            number += 1
          }
        }
      }

      if (x > 0) {
        if (Mine.grid[x - 1][y].bomb) {
          number += 1
        }
      }

      if (x < Mine.grid_size - 1) {
        if (Mine.grid[x + 1][y].bomb) {
          number += 1
        }
      }

      if (y < Mine.grid_size - 1) {
        if (Mine.grid[x][y + 1].bomb) {
          number += 1
        }

        if (x > 0) {
          if (Mine.grid[x - 1][y + 1].bomb) {
            number += 1
          }
        }

        if (x < Mine.grid_size - 1) {
          if (Mine.grid[x + 1][y + 1].bomb) {
            number += 1
          }
        }
      }

      let item = Mine.grid[x][y]
      item.number = number
      let text = document.createElement('div')
      text.classList.add('number')

      if (item.bomb) {
        text.textContent = '💣️'
      } else {
        if (number > 0) {
          text.textContent = number
        }
      }

      item.og_number = text.textContent
      item.block.append(text)
    }
  }
}

Mine.random_int = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

Mine.onclick = function (x, y) {
  if (Mine.over) return
  if (!Mine.playing) Mine.unpause()
  Mine.start_game(x, y)
  let item = Mine.grid[x][y]
  if (item.revealed) return
  
  if (item.flag) {
    Mine.flag(x, y, false)
  }
  
  Mine.num_clicks += 1

  if (item.bomb) {
    item.block.classList.add('bombhit')
    Mine.gameover("explosion")
    return
  } else {
    if (item.revealed) return
    Mine.floodfill(x, y)
  }

  Mine.check_status()
  Mine.playsound(Mine.click_fx)
}

Mine.setnumber = function (item, s) {
  item.block.querySelector('.number').textContent = s
}

Mine.gameover = function (mode) {
  Mine.over = true
  Mine.playing = false

  for (let row of Mine.grid) {
    for (let item of row) {
      if (item.bomb) {
        if (!item.revealed) {
          Mine.reveal(item)
        }

        if (item.flag) {
          Mine.setnumber(item, item.og_number)
        }
      }
    }
  }

  if (mode === "won") {
    Mine.bombs_el.textContent += ' - You Won! (Click to Restart)'
    Mine.playsound(Mine.victory_fx)
  } else if (mode === "explosion") {
    Mine.bombs_el.textContent += ' - Boom! (Click to Restart)'
    Mine.playsound(Mine.explosion_fx)
  } else if (mode === "timeout") {
    Mine.bombs_el.textContent += ' - Out of Time! (click to restart)'
    Mine.playsound(Mine.explosion_fx)
  }

  if (mode !== "won") {
    Mine.main_el.classList.add('boom')
  }
}

Mine.floodfill = function (x, y) {
  let item = Mine.grid[x][y]

  if (item.number > 0) {
    Mine.reveal(item)
    return
  }

  Mine.fill(x, y)
}

Mine.fill = function (x, y) {
  if (x < 0) {
    return
  }

  if (y < 0) {
    return
  }

  if (x > Mine.grid.length - 1) {
    return
  }

  if (y > Mine.grid[x].length - 1) {
    return
  }

  let item = Mine.grid[x][y]
  
  if (item.revealed) {
    return
  }

  let cont = item.number === 0

  if (!item.revealed) {
    Mine.reveal(item)
  }

  if (cont) {
    Mine.fill(x - 1, y)
    Mine.fill(x + 1, y)
    Mine.fill(x, y - 1)
    Mine.fill(x, y + 1)
    Mine.fill(x - 1, y + 1)
    Mine.fill(x + 1, y - 1)
    Mine.fill(x + 1, y + 1)
    Mine.fill(x - 1, y - 1)
  }
}

Mine.reveal = function (item) {
  item.block.classList.add('revealed')
  item.revealed = true
  Mine.num_revealed += 1
}

Mine.flag = function (x, y, check = true) {
  if (Mine.over) return
  if (!Mine.playing) Mine.unpause()
  Mine.start_game(x, y)
  let item = Mine.grid[x][y]
  if (item.revealed) return
  item.flag = !item.flag

  if (item.flag) {
    item.block.classList.add('flag')
    Mine.setnumber(item, '⚑')
    Mine.num_bombs -= 1
  } else {
    item.block.classList.remove('flag')
    Mine.setnumber(item, item.og_number)
    Mine.num_bombs += 1
  }

  Mine.update_bombs()

  if (check) {
    Mine.check_status()
  }
}

Mine.update_bombs = function () {
  let s

  if (Mine.num_bombs === 1) {
    s = 'Bomb'
  } else {
    s = 'Bombs'
  }

  Mine.bombs_el.textContent = `${Mine.num_bombs} ${s} Left`
}

Mine.start_info = function () {
  Mine.bombs_el.addEventListener('click', function () {
    Mine.ask_restart()
  })

  Mine.time_el.addEventListener('click', function () {
    Mine.toggle_pause()
  })
}

Mine.update_info = function () {
  Mine.update_bombs()
  Mine.update_time()
}

Mine.timestring = function (n) {
  return n.toString().padStart(3, "0")
}

Mine.update_time = function () {
  Mine.time_el.textContent = Mine.timestring(Mine.time) + ' / ' + Mine.timestring(Mine.max_time)
}

Mine.start_time = function () {
  clearInterval(Mine.time_interval)

  Mine.time_interval = setInterval(() => {
    if (Mine.playing) {
      Mine.time += 1
      Mine.update_time()
      if (Mine.time >= Mine.max_time) {
        Mine.gameover("timeout")
      }
    }
  }, 1000)
}

Mine.check_status = function () {
  if (Mine.do_check_status()) {
    Mine.gameover("won")
  }
}

Mine.do_check_status = function () {
  for (let row of Mine.grid) {
    for (let item of row) {
      if (item.bomb) {
        if (!item.flag) {
          return false
        }
      }

      if (!item.revealed) {
        if (!item.flag) {
          return false
        }
      }

      if (item.flag) {
        if (!item.bomb) {
          return false
        }
      }
    }
  }

  return true
}

Mine.playsound = function (el) {
  el.pause()
  el.currentTime = 0
  el.play()
}

Mine.toggle_pause = function () {
  if (Mine.playing) {
    Mine.pause()
  } else {
    Mine.unpause()
  }
}

Mine.pause = function () {
  if (Mine.over) return
  if (!Mine.playing) return
  Mine.playing = false
  Mine.time_el.textContent += ' (Paused)'
}

Mine.unpause = function () {
  if (Mine.over) return
  if (Mine.playing) return
  Mine.playing = true
  Mine.update_time()
}

Mine.start_levels = function () {
  Mine.levels_el.addEventListener('click', function (e) {
    let level = e.target.dataset.level
    if (level) {
      if (level === Mine.level) {
        Mine.ask_restart()
        return
      }

      for (let div of Array.from(Mine.levels_el.querySelectorAll('div'))) {
        div.classList.remove('level_selected')
        if (div.dataset.level === level) {
          div.classList.add('level_selected')
        } else {
          div.classList.remove('level_selected')
        }
      }

      Mine.level = level
      Mine.ask_restart()
    }
  })
}

Mine.check_level = function () {
  if (Mine.level === 'tiny') {
    Mine.initial_bombs = 5
    Mine.grid_size = 6
    Mine.max_time = 50

  } else if (Mine.level === 'small') {
    Mine.initial_bombs = 10
    Mine.grid_size = 10
    Mine.max_time = 100

  } else if(Mine.level === 'normal') {
    Mine.initial_bombs = 30
    Mine.grid_size = 15
    Mine.max_time = 300

  } else if(Mine.level === 'big') {
    Mine.initial_bombs = 60
    Mine.grid_size = 20
    Mine.max_time = 600

  } else if(Mine.level === 'insane') {
    Mine.initial_bombs = 100
    Mine.grid_size = 20
    Mine.max_time = 100
  }
}

Mine.ask_restart = function () {
  if (!Mine.over) {
    if (Mine.num_clicks > 1) {
      if (confirm('Restart Game?')) Mine.prepare_game()
      return
    }
  }

  Mine.prepare_game()
}