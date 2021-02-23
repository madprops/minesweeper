const Mines = {}
Mines.level = 'normal'

Mines.init = function () {
  let style = getComputedStyle(document.body)
  Mines.size = parseInt(style.getPropertyValue('--size'))
  Mines.main_el = document.querySelector('#main')
  Mines.grid_el = document.querySelector('#grid')
  Mines.mines_el = document.querySelector('#mines')
  Mines.time_el = document.querySelector('#time')
  Mines.levels_el = document.querySelector('#levels')
  Mines.explosion_fx = document.querySelector('#audio_explosion')
  Mines.click_fx = document.querySelector('#audio_click')
  Mines.victory_fx = document.querySelector('#audio_victory')
  Mines.start_fx = document.querySelector('#audio_start')
  Mines.face_el = document.querySelector('#face')

  Mines.start_events()
  Mines.start_info()
  Mines.start_levels()
  Mines.prepare_game()
}

Mines.start_events = function () {
  Mines.grid_el.addEventListener('contextmenu', function (e) {
    e.preventDefault()
  })

  document.addEventListener(
    'visibilitychange',
    function () {
      if (document.hidden) {
        Mines.pause()
      }
    },
    false
  )

  Mines.grid_el.addEventListener('mousedown', function () {
    Mines.change_face('pressing')
  })

  Mines.grid_el.addEventListener('mouseup', function () {
    Mines.change_face('waiting')
  })

  document.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      Mines.ask_restart()
    } else if (e.key === ' ') {
      Mines.toggle_pause()
    }
  })
}

Mines.change_face = function (s, force = false) {
  if (!force && Mines.over) return
  Mines.face_el.src = `img/face_${s}.png`
}

Mines.prepare_game = function () {
  Mines.game_started = false
  Mines.check_level()
  Mines.over = false
  Mines.num_revealed = 0
  Mines.num_clicks = 0
  Mines.main_el.classList.remove('boom')
  Mines.playing = true
  Mines.num_mines = Mines.initial_mines
  Mines.create_grid()
  clearInterval(Mines.time_interval)
  Mines.time = 0
  Mines.update_info()
  Mines.change_face('waiting')
}

Mines.create_grid = function () {
  Mines.grid_el.innerHTML = ''
  Mines.grid = []
  let size = Mines.size / Mines.grid_size
  let x = 0
  let y = 0
  let row = []

  for (let xx = 0; xx < Mines.grid_size; xx++) {
    for (let yy = 0; yy < Mines.grid_size; yy++) {
      let block = document.createElement('div')
      block.style.width = size + 'px'
      block.style.height = size + 'px'
      block.style.left = x + 'px'
      block.style.top = y + 'px'
      block.classList.add('block')

      block.addEventListener('click', function () {
        Mines.onclick(xx, yy)
      })

      block.addEventListener('contextmenu', function (e) {
        Mines.flag(xx, yy)
        e.preventDefault()
      })

      Mines.grid_el.append(block)

      let item = {}
      item.x = xx
      item.y = yy
      item.block = block
      item.revealed = false
      row.push(item)

      x += size
    }

    Mines.grid.push(row)
    row = []

    x = 0
    y += size
  }
}

Mines.shuffle = function (arr) {
  if (arr.length === 1) {
    return arr
  }
  const rand = Math.floor(Math.random() * arr.length)
  return [arr[rand], ...Mines.shuffle(arr.filter((_, i) => i != rand))]
}

Mines.start_game = function (x, y) {
  if (Mines.game_started) return

  let pairs = []

  for (let xx = 0; xx < Mines.grid_size; xx++) {
    for (let yy = 0; yy < Mines.grid_size; yy++) {
      if (xx === x && yy === y) continue

      if (xx >= x - 1 && xx <= x + 1) {
        if (yy >= y - 1 && yy <= y + 1) continue
      }

      pairs.push([xx, yy])
    }
  }

  let num = 0

  for (let p of Mines.shuffle(pairs)) {
    let item = Mines.grid[p[0]][p[1]]
    item.mine = true
    item.block.classList.add('mine')
    num += 1
    if (num >= Mines.num_mines) break
  }

  Mines.game_started = true
  Mines.check_mines()
  Mines.start_time()
  Mines.playsound(Mines.start_fx)
}

Mines.check_mines = function () {
  for (let x = 0; x < Mines.grid_size; x++) {
    for (let y = 0; y < Mines.grid_size; y++) {
      let number = 0

      if (y > 0) {
        if (Mines.grid[x][y - 1].mine) {
          number += 1
        }

        if (x > 0) {
          if (Mines.grid[x - 1][y - 1].mine) {
            number += 1
          }
        }

        if (x < Mines.grid_size - 1) {
          if (Mines.grid[x + 1][y - 1].mine) {
            number += 1
          }
        }
      }

      if (x > 0) {
        if (Mines.grid[x - 1][y].mine) {
          number += 1
        }
      }

      if (x < Mines.grid_size - 1) {
        if (Mines.grid[x + 1][y].mine) {
          number += 1
        }
      }

      if (y < Mines.grid_size - 1) {
        if (Mines.grid[x][y + 1].mine) {
          number += 1
        }

        if (x > 0) {
          if (Mines.grid[x - 1][y + 1].mine) {
            number += 1
          }
        }

        if (x < Mines.grid_size - 1) {
          if (Mines.grid[x + 1][y + 1].mine) {
            number += 1
          }
        }
      }

      let item = Mines.grid[x][y]
      item.number = number
      let text = document.createElement('div')
      text.classList.add('number')

      if (item.mine) {
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

Mines.random_int = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

Mines.onclick = function (x, y) {
  if (Mines.over) return
  if (!Mines.playing) Mines.unpause()
  Mines.start_game(x, y)
  let item = Mines.grid[x][y]
  if (item.revealed) return
  
  Mines.num_clicks += 1

  if (item.mine) {
    item.block.classList.add('minehit')
    Mines.gameover('explosion')
    return
  } else {
    if (item.revealed) return
    Mines.floodfill(x, y)
  }

  if (!Mines.check_status()) {
    Mines.playsound(Mines.click_fx)
  }
}

Mines.setnumber = function (item, s) {
  item.block.querySelector('.number').textContent = s
}

Mines.gameover = function (mode) {
  Mines.over = true
  Mines.playing = false

  for (let row of Mines.grid) {
    for (let item of row) {
      if (item.mine) {
        if (!item.revealed) {
          Mines.reveal(item.x, item.y)
        }

        if (item.flag) {
          Mines.setnumber(item, item.og_number)
        }
      }
    }
  }

  if (mode === 'won') {
    Mines.mines_el.textContent = 'You cleared all the mines!'
    Mines.playsound(Mines.victory_fx)
    Mines.change_face('won', true)
  } else if (mode === 'explosion') {
    Mines.mines_el.textContent = 'You stepped on a mine!'
    Mines.playsound(Mines.explosion_fx)
    Mines.change_face('lost', true)
  } else if (mode === 'timeout') {
    Mines.mines_el.textContent = 'You ran out of time!'
    Mines.playsound(Mines.explosion_fx)
    Mines.change_face('lost', true)
  }

  if (mode !== 'won') {
    Mines.main_el.classList.add('boom')
  }
}

Mines.floodfill = function (x, y) {
  let item = Mines.grid[x][y]

  if (item.number > 0) {
    Mines.reveal(x, y)
    return
  }

  Mines.fill(x, y)
}

Mines.fill = function (x, y) {
  if (x < 0) {
    return
  }

  if (y < 0) {
    return
  }

  if (x > Mines.grid.length - 1) {
    return
  }

  if (y > Mines.grid[x].length - 1) {
    return
  }

  let item = Mines.grid[x][y]
  
  if (item.revealed) {
    return
  }

  let cont = item.number === 0

  if (!item.revealed) {
    Mines.reveal(x, y)
  }

  if (cont) {
    Mines.fill(x - 1, y)
    Mines.fill(x + 1, y)
    Mines.fill(x, y - 1)
    Mines.fill(x, y + 1)
    Mines.fill(x - 1, y + 1)
    Mines.fill(x + 1, y - 1)
    Mines.fill(x + 1, y + 1)
    Mines.fill(x - 1, y - 1)
  }
}

Mines.reveal = function (x, y) {
  let item = Mines.grid[x][y]

  if (item.flag) {
    Mines.flag(x, y)
  }

  item.block.classList.add('revealed')
  item.revealed = true
  Mines.num_revealed += 1
}

Mines.flag = function (x, y) {
  if (Mines.over) return
  if (!Mines.playing) Mines.unpause()
  Mines.start_game(x, y)
  let item = Mines.grid[x][y]
  if (item.revealed) return
  item.flag = !item.flag

  if (item.flag) {
    item.block.classList.add('flag')
    Mines.setnumber(item, '⚑')
    Mines.num_mines -= 1
  } else {
    item.block.classList.remove('flag')
    Mines.setnumber(item, item.og_number)
    Mines.num_mines += 1
  }

  Mines.update_mines()
}

Mines.update_mines = function () {
  let s

  if (Mines.num_mines === 1) {
    s = 'mines'
  } else {
    s = 'mines'
  }

  Mines.mines_el.textContent = `${Mines.num_mines} ${s} (${Mines.grid_size} x ${Mines.grid_size})`
}

Mines.start_info = function () {
  Mines.face_el.addEventListener('click', function () {
    Mines.ask_restart()
  })

  Mines.time_el.addEventListener('click', function () {
    Mines.toggle_pause()
  })
}

Mines.update_info = function () {
  Mines.update_mines()
  Mines.update_time()
}

Mines.timestring = function (n) {
  return n.toString().padStart(3, '0')
}

Mines.update_time = function () {
  Mines.time_el.textContent = 'Time: ' + Mines.timestring(Mines.time) + ' / ' + Mines.timestring(Mines.max_time)
}

Mines.start_time = function () {
  clearInterval(Mines.time_interval)

  Mines.time_interval = setInterval(() => {
    if (Mines.playing) {
      Mines.time += 1
      Mines.update_time()
      if (Mines.time >= Mines.max_time) {
        Mines.gameover('timeout')
      }
    }
  }, 1000)
}

Mines.check_status = function () {
  if (Mines.num_revealed == (Mines.grid_size * Mines.grid_size) - Mines.initial_mines) {
    Mines.gameover('won')
    return true
  }

  return false
}

Mines.playsound = function (el) {
  el.pause()
  el.currentTime = 0
  el.play()
}

Mines.toggle_pause = function () {
  if (Mines.playing) {
    Mines.pause()
  } else {
    Mines.unpause()
  }
}

Mines.pause = function () {
  if (Mines.over) return
  if (!Mines.game_started) return
  if (!Mines.playing) return
  Mines.playing = false
  Mines.time_el.textContent += ' (Paused)'
}

Mines.unpause = function () {
  if (Mines.over) return
  if (Mines.playing) return
  Mines.playing = true
  Mines.update_time()
}

Mines.start_levels = function () {
  Mines.levels_el.addEventListener('click', function (e) {
    let level = e.target.dataset.level
    if (level) {
      if (level === Mines.level) {
        Mines.ask_restart()
        return
      }

      for (let div of Array.from(Mines.levels_el.querySelectorAll('div'))) {
        div.classList.remove('level_selected')
        if (div.dataset.level === level) {
          div.classList.add('level_selected')
        } else {
          div.classList.remove('level_selected')
        }
      }

      Mines.level = level
      Mines.ask_restart()
    }
  })
}

Mines.check_level = function () {
  if (Mines.level === 'easy') {
    Mines.initial_mines = 10
    Mines.grid_size = 10
    Mines.max_time = 100

  } else if(Mines.level === 'normal') {
    Mines.initial_mines = 30
    Mines.grid_size = 15
    Mines.max_time = 300

  } else if(Mines.level === 'hard') {
    Mines.initial_mines = 60
    Mines.grid_size = 20
    Mines.max_time = 600

  } else if(Mines.level === 'expert') {
    Mines.initial_mines = 80
    Mines.grid_size = 20
    Mines.max_time = 200
  }
}

Mines.ask_restart = function () {
  if (!Mines.over) {
    if (Mines.num_clicks > 1) {
      if (confirm('Restart Game?')) Mines.prepare_game()
      return
    }
  }

  Mines.prepare_game()
}