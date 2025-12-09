
import pygame
import random
import sys

# --- Config (static) ---
TILE = 20  # Snake moves in grid steps
BG_COLOR = (30, 30, 30)
FOOD_COLOR = (220, 60, 60)
GRID_COLOR = (50, 50, 50)
FONT_COLOR = (230, 230, 230)
BORDER_COLOR = (220, 0, 0)
BORDER_THICKNESS = 6

# Color palette for the snake (changes every 3 eats)
PALETTE = [
    (0, 200, 80),
    (0, 180, 220),
    (255, 180, 0),
    (180, 80, 200),
    (200, 70, 70),
    (80, 200, 160),
]

def darker(color, factor=0.8):
    return tuple(max(0, min(255, int(c * factor))) for c in color)

# --- Helpers ---
def draw_grid(surface, width, height):
    for x in range(0, width, TILE):
        pygame.draw.line(surface, GRID_COLOR, (x, 0), (x, height))
    for y in range(0, height, TILE):
        pygame.draw.line(surface, GRID_COLOR, (0, y), (width, y))

def random_cell(width, height):
    cols = width // TILE
    rows = height // TILE
    return (random.randint(0, cols - 1) * TILE, random.randint(0, rows - 1) * TILE)

# --- UI Button ---
class Button:
    def __init__(self, rect, label, font, bg=(60, 60, 60), fg=(230, 230, 230)):
        self.rect = pygame.Rect(rect)
        self.label = label
        self.font = font
        self.bg = bg
        self.fg = fg

    def draw(self, surface, active=False):
        color = (90, 90, 90) if active else self.bg
        pygame.draw.rect(surface, color, self.rect, border_radius=6)
        pygame.draw.rect(surface, (120, 120, 120), self.rect, width=2, border_radius=6)
        text = self.font.render(self.label, True, self.fg)
        tx = self.rect.x + (self.rect.width - text.get_width()) // 2
        ty = self.rect.y + (self.rect.height - text.get_height()) // 2
        surface.blit(text, (tx, ty))

    def hit(self, pos):
        return self.rect.collidepoint(pos)

# --- Game Objects ---
class Snake:
    def __init__(self, width, height):
        self.width, self.height = width, height
        self.base_color = PALETTE[0]
        self.body_color = darker(self.base_color)
        self.reset()

    def reset(self):
        self.body = [(self.width // 2 // TILE * TILE, self.height // 2 // TILE * TILE)]
        self.direction = (TILE, 0)  # moving right
        self.grow = 0

    def head(self):
        return self.body[0]

    def change_dir(self, new_dir):
        # Prevent reversing directly into itself
        if (new_dir[0] == -self.direction[0] and new_dir[1] == -self.direction[1]):
            return
        self.direction = new_dir

    def move(self):
        hx, hy = self.head()
        nx, ny = hx + self.direction[0], hy + self.direction[1]
        new_head = (nx, ny)
        self.body.insert(0, new_head)
        if self.grow > 0:
            self.grow -= 1
        else:
            self.body.pop()

    def collide_self(self):
        return self.head() in self.body[1:]

    def collide_wall(self):
        x, y = self.head()
        return x < 0 or x >= self.width or y < 0 or y >= self.height

    def set_color_by_score(self, score):
        idx = (score // 3) % len(PALETTE)
        self.base_color = PALETTE[idx]
        self.body_color = darker(self.base_color, 0.8)

    def draw_head(self, surface):
        x, y = self.head()
        # Head block
        pygame.draw.rect(surface, self.base_color, (x, y, TILE, TILE), border_radius=6)

        # Eyes oriented to movement
        dx = self.direction[0] // TILE  # -1, 0, 1
        dy = self.direction[1] // TILE  # -1, 0, 1

        eye_radius = max(2, TILE // 6)
        pupil_radius = max(1, TILE // 10)

        if dx == 1:          # facing right
            e1 = (x + int(TILE * 0.65), y + int(TILE * 0.35))
            e2 = (x + int(TILE * 0.65), y + int(TILE * 0.65))
            pupil_offset = (eye_radius // 2, 0)
        elif dx == -1:       # facing left
            e1 = (x + int(TILE * 0.35), y + int(TILE * 0.35))
            e2 = (x + int(TILE * 0.35), y + int(TILE * 0.65))
            pupil_offset = (-eye_radius // 2, 0)
        elif dy == -1:       # facing up
            e1 = (x + int(TILE * 0.35), y + int(TILE * 0.35))
            e2 = (x + int(TILE * 0.65), y + int(TILE * 0.35))
            pupil_offset = (0, -eye_radius // 2)
        else:                # facing down
            e1 = (x + int(TILE * 0.35), y + int(TILE * 0.65))
            e2 = (x + int(TILE * 0.65), y + int(TILE * 0.65))
            pupil_offset = (0, eye_radius // 2)

        for ex, ey in (e1, e2):
            pygame.draw.circle(surface, (255, 255, 255), (ex, ey), eye_radius)
            pygame.draw.circle(surface, (20, 20, 20), (ex + pupil_offset[0], ey + pupil_offset[1]), pupil_radius)

    def draw_body(self, surface):
        for (x, y) in self.body[1:]:
            pygame.draw.rect(surface, self.body_color, (x, y, TILE, TILE), border_radius=4)

    def draw(self, surface):
        self.draw_head(surface)
        self.draw_body(surface)

class Food:
    def __init__(self, snake_body, width, height):
        self.width, self.height = width, height
        self.pos = self.spawn(snake_body)

    def spawn(self, snake_body):
        while True:
            p = random_cell(self.width, self.height)
            if p not in snake_body:
                return p

    def draw(self, surface):
        x, y = self.pos
        pygame.draw.rect(surface, FOOD_COLOR, (x, y, TILE, TILE), border_radius=4)

# --- Main ---
def main():
    pygame.init()
    # Fullscreen
    screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
    pygame.display.set_caption("Snake")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont(None, 28)
    hud_font = pygame.font.SysFont(None, 24)

    WIDTH, HEIGHT = screen.get_size()

    # Game state
    snake = Snake(WIDTH, HEIGHT)
    food = Food(snake.body, WIDTH, HEIGHT)
    score = 0
    paused = False

    # Speed options (clickable buttons)
    speeds = [("Slow", 8), ("Normal", 12), ("Fast", 16), ("Insane", 20)]
    current_speed_idx = 1  # default Normal
    FPS = speeds[current_speed_idx][1]

    # UI buttons layout
    pause_btn = Button((10, 10, 120, 36), "Pause", font)
    # Speed buttons in top center
    btns = []
    total_btns_w = len(speeds) * 110 + (len(speeds) - 1) * 10
    start_x = (WIDTH - total_btns_w) // 2
    y = 10
    for i, (label, _) in enumerate(speeds):
        btns.append(Button((start_x + i * 120, y, 110, 36), label, font))

    running = True
    while running:
        # --- Events ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_q):
                    running = False
                elif event.key in (pygame.K_SPACE, pygame.K_p):
                    paused = not paused
                elif not paused:
                    if event.key in (pygame.K_UP, pygame.K_w):
                        snake.change_dir((0, -TILE))
                    elif event.key in (pygame.K_DOWN, pygame.K_s):
                        snake.change_dir((0, TILE))
                    elif event.key in (pygame.K_LEFT, pygame.K_a):
                        snake.change_dir((-TILE, 0))
                    elif event.key in (pygame.K_RIGHT, pygame.K_d):
                        snake.change_dir((TILE, 0))

                # Optional keyboard speed cycling: press number keys 1-4
                if event.key in (pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4):
                    current_speed_idx = [pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4].index(event.key)
                    FPS = speeds[current_speed_idx][1]

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                pos = event.pos
                if pause_btn.hit(pos):
                    paused = not paused
                for i, b in enumerate(btns):
                    if b.hit(pos):
                        current_speed_idx = i
                        FPS = speeds[i][1]

        if paused:
            # Draw paused overlay and tick slower
            screen.fill(BG_COLOR)
            draw_grid(screen, WIDTH, HEIGHT)
            snake.draw(screen)
            food.draw(screen)
            # Border
            pygame.draw.rect(screen, BORDER_COLOR, (0, 0, WIDTH, HEIGHT), width=BORDER_THICKNESS)
            # Buttons
            pause_btn.draw(screen, active=True)
            for i, b in enumerate(btns):
                b.draw(screen, active=(i == current_speed_idx))

            paused_text = font.render("Paused", True, FONT_COLOR)
            screen.blit(paused_text, (10, 60))
            pygame.display.flip()
            clock.tick(6)
            continue

        # --- Update ---
        snake.move()

        # Check collisions
        if snake.collide_wall() or snake.collide_self():
            # Game over -> reset
            score = 0
            snake = Snake(WIDTH, HEIGHT)
            food = Food(snake.body, WIDTH, HEIGHT)

        # Eat food
        if snake.head() == food.pos:
            score += 1
            snake.grow += 1
            # Update color every 3 eats
            snake.set_color_by_score(score)
            food = Food(snake.body, WIDTH, HEIGHT)

        # --- Draw ---
        screen.fill(BG_COLOR)
        draw_grid(screen, WIDTH, HEIGHT)
        snake.draw(screen)
        food.draw(screen)

        # Red border (full screen)
        pygame.draw.rect(screen, BORDER_COLOR, (0, 0, WIDTH, HEIGHT), width=BORDER_THICKNESS)

        # HUD + Buttons
        pause_btn.draw(screen, active=paused)
        for i, b in enumerate(btns):
            b.draw(screen, active=(i == current_speed_idx))

        hud = hud_font.render(
            f"Score: {score}   Speed: {speeds[current_speed_idx][0]}   (WASD/Arrows to move, Space/P to pause, 1-4 to set speed, Esc/Q to quit)",
            True, FONT_COLOR
        )
        screen.blit(hud, (10, 60))

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()

