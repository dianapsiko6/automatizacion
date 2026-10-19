from playwright.sync_api import Page # import the page clase, que nos permite interactuar con la pagina web
import pytest # import the pytest library, que nos permite ejecutar pruebas unitarias
# vamos a verificar el  nombre o titulo de la pagina
# test al ingresar cuando estelgueado debe devolver un error que debemos estar logueados

def test_title(page: Page): # definimos la funcion test_title que recibe como parametro page de tipo Page
    page.goto("/") # abrimos la pagina web
    assert page.title() == "Swag Labs" # verificamos que el titulo de la pagina sea "Swag Labs"
    # que es assert? es una palabra reservada de python que nos permite verificar que una condicion sea verdadera, si no lo es, lanza un error y detiene la ejecucion del programa
    
def test_login_error(page: Page): # definimos la funcion test_login_error que recibe como parametro
    page.goto("/") # abrimos la pagina web
    assert page.inner_text("h3[data-test='error']") == "Epic sadface: You can only access '/inventory.html' when you are logged in." # verificamos que el mensaje de error sea el esperado
    