// cypress/e2e/api.cy.js

describe('API Tests Eco Bliss Bath', () => {
   let authToken;
 
   before(() => {
     cy.fixture('user').then((user) => {
       cy.request({
         method: 'POST',
         url: 'http://localhost:8081/login',
         body: { username: user.email, password: user.password },
         headers: { 'Content-Type': 'application/json' },
         failOnStatusCode: false
       }).then((response) => {
         if (response.status === 200 && response.body.token) {
           authToken = response.body.token;
           Cypress.env('authToken', authToken);
         } else {
           cy.request({
              method: 'POST',
              url: 'http://localhost:8081/register',
              body: {
                 email: user.email,
                 plainPassword: { first: user.password, second: user.password },
                 firstname: user.firstname,
                 lastname: user.lastname
              },
              headers: { 'Content-Type': 'application/json'},
              failOnStatusCode: false
           }).then((regResponse) => {
               if (regResponse.status === 200 || regResponse.status === 400) {
                  cy.loginViaApi(user.email, user.password).then(token => {
                    authToken = token;
                    Cypress.env('authToken', authToken);
                  });
               } else {
                  throw new Error(`Registration failed unexpectedly with status ${regResponse.status}`);
               }
           });
         }
       });
     });
     cy.wrap(null).should(() => {
         expect(Cypress.env('authToken')).to.not.be.undefined;
         authToken = Cypress.env('authToken');
     });
   });
 
   it('GET /orders - Should fail with 403 when not authenticated', () => {
     cy.request({
       method: 'GET',
       url: 'http://localhost:8081/orders',
       failOnStatusCode: false,
     }).then((response) => {
       expect(response.status).to.eq(403);
     });
   });
 
   it('GET /products - Should return product list', () => {
     cy.request('GET', 'http://localhost:8081/products').then((response) => {
       expect(response.status).to.eq(200);
       expect(response.body).to.be.an('array');
       if (response.body.length > 0) {
         expect(response.body[0]).to.have.all.keys('id', 'name', 'availableStock', 'skin', 'aromas', 'ingredients', 'description', 'price', 'picture', 'varieties');
       }
     });
   });
 
    it('GET /products/{id} - Should return a specific product', () => {
       cy.request('GET', 'http://localhost:8081/products').then((listResponse) => {
          expect(listResponse.status).to.eq(200);
          expect(listResponse.body.length).to.be.greaterThan(0);
          const productId = listResponse.body[0].id;
 
          cy.request('GET', `http://localhost:8081/products/${productId}`).then((response) => {
             expect(response.status).to.eq(200);
             expect(response.body).to.have.property('id', productId);
             expect(response.body).to.have.all.keys('id', 'name', 'availableStock', 'skin', 'aromas', 'ingredients', 'description', 'price', 'picture', 'varieties');
          });
       });
    });
 
    it('GET /products/random - Should return 3 random products', () => {
       cy.request('GET', 'http://localhost:8081/products/random').then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array').that.has.lengthOf(3);
          if (response.body.length > 0) {
              expect(response.body[0]).to.have.all.keys('id', 'name', 'availableStock', 'skin', 'aromas', 'ingredients', 'description', 'price', 'picture', 'varieties');
          }
       });
    });
 
    it('POST /login - Should succeed with valid credentials', () => {
       cy.fixture('user').then((user) => {
         cy.loginViaApi(user.email, user.password).then(token => {
             expect(token).to.be.a('string');
         });
       });
    });
 
    it('POST /login - Should fail with invalid credentials', () => {
       cy.fixture('user').then((user) => {
         cy.request({
           method: 'POST',
           url: 'http://localhost:8081/login',
           body: { username: user.email, password: user.invalidPassword },
           headers: { 'Content-Type': 'application/json' },
           failOnStatusCode: false,
         }).then((response) => {
           expect(response.status).to.eq(401);
         });
       });
    });
 
    it('GET /me - Should return current user info when authenticated', () => {
        cy.fixture('user').then((user) => {
           expect(authToken).to.not.be.undefined;
           cy.request({
              method: 'GET',
              url: 'http://localhost:8081/me',
              headers: { 'Authorization': `Bearer ${authToken}` }
           }).then((response) => {
              expect(response.status).to.eq(200);
              expect(response.body).to.have.property('email', user.email);
              expect(response.body).to.have.property('firstname', user.firstname);
           });
        });
    });
 
    it('PUT /orders/add - Should add product to cart when authenticated', () => {
        expect(authToken).to.not.be.undefined;
        cy.request('GET', 'http://localhost:8081/products').then((listResponse) => {
            const productToAdd = listResponse.body.find(p => p.availableStock > 0);
            expect(productToAdd, 'Need a product with available stock').to.not.be.undefined;
            const productId = productToAdd.id;
            const quantityToAdd = 1;
 
            cy.request({
               method: 'PUT',
               url: `http://localhost:8081/orders/add`,
               headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
               },
               body: { product: productId, quantity: quantityToAdd },
            }).then((response) => {
               expect(response.status).to.eq(200);
               expect(response.body).to.have.property('id');
               expect(response.body.orderLines).to.be.an('array');
               const line = response.body.orderLines.find(l => l.product.id === productId);
               expect(line).to.not.be.undefined;
               expect(line.quantity).to.be.at.least(quantityToAdd);
            });
        });
    });
 
     it('PUT /orders/add - Should REJECT when adding product with insufficient stock', () => {
         expect(authToken).to.not.be.undefined;
         cy.request('GET', 'http://localhost:8081/products').then((listResponse) => {
             const productToAdd = listResponse.body.find(p => p.availableStock >= 0);
             expect(productToAdd, 'Need a product to test').to.not.be.undefined;
             const productId = productToAdd.id;
             const quantityToAdd = productToAdd.availableStock + 10;
 
             cy.request({
                method: 'PUT',
                url: `http://localhost:8081/orders/add`,
                headers: {
                   'Authorization': `Bearer ${authToken}`,
                   'Content-Type': 'application/json',
                },
                body: { product: productId, quantity: quantityToAdd },
                failOnStatusCode: false
             }).then((response) => {
                 expect(response.status).to.be.oneOf([400, 409], "API should reject adding more than available stock");
             });
         });
     });
 
    it('GET /orders - Should return current cart when authenticated', () => {
         expect(authToken).to.not.be.undefined;
         cy.emptyCartViaApi();
         cy.addProductToCartViaApi(3, 1);
 
         cy.getCartViaApi().then((response) => {
              expect(response.status).to.eq(200);
              expect(response.body).to.have.property('id');
              expect(response.body.validated).to.be.false;
              expect(response.body.orderLines).to.be.an('array').that.has.lengthOf(1);
              expect(response.body.orderLines[0].product.id).to.eq(3);
              expect(response.body.orderLines[0].quantity).to.eq(1);
         });
    });
 
     it('DELETE /orders/{id}/delete - Should remove product line from cart', () => {
         expect(authToken).to.not.be.undefined;
         cy.emptyCartViaApi();
         cy.addProductToCartViaApi(4, 2);
 
         cy.getCartViaApi().then(getResponse => {
             expect(getResponse.status).to.eq(200);
             const line = getResponse.body.orderLines.find(l => l.product.id === 4);
             expect(line, 'Order line for product 4 should exist').to.not.be.undefined;
             const lineId = line.id;
 
             cy.request({
                method: 'DELETE',
                url: `http://localhost:8081/orders/${lineId}/delete`,
                headers: { 'Authorization': `Bearer ${authToken}` }
             }).then(deleteResponse => {
                expect(deleteResponse.status).to.eq(200);
                cy.getCartViaApi().then(finalResponse => {
                    if (finalResponse.status === 200) {
                       const remainingLine = finalResponse.body.orderLines.find(l => l.id === lineId);
                       expect(remainingLine).to.be.undefined;
                    } else {
                       expect(finalResponse.status).to.eq(404);
                    }
                });
             });
         });
     });
 
     it('PUT /orders/{id}/change-quantity - Should update product quantity in cart', () => {
         expect(authToken).to.not.be.undefined;
         cy.emptyCartViaApi();
         cy.addProductToCartViaApi(5, 1);
 
         cy.getCartViaApi().then(getResponse => {
             expect(getResponse.status).to.eq(200);
             const line = getResponse.body.orderLines.find(l => l.product.id === 5);
             expect(line, 'Order line for product 5 should exist').to.not.be.undefined;
             const lineId = line.id;
             const newQuantity = 3;
 
             cy.request({
                method: 'PUT',
                url: `http://localhost:8081/orders/${lineId}/change-quantity`,
                headers: {
                   'Authorization': `Bearer ${authToken}`,
                   'Content-Type': 'application/json',
                },
                body: { quantity: newQuantity }
             }).then(putResponse => {
                expect(putResponse.status).to.eq(200);
                cy.getCartViaApi().then(finalResponse => {
                    expect(finalResponse.status).to.eq(200);
                    const updatedLine = finalResponse.body.orderLines.find(l => l.id === lineId);
                    expect(updatedLine).to.not.be.undefined;
                    expect(updatedLine.quantity).to.eq(newQuantity);
                });
             });
         });
     });
 
     it('POST /orders - Should validate the cart and create an order', () => {
         expect(authToken).to.not.be.undefined;
         cy.emptyCartViaApi();
         cy.addProductToCartViaApi(6, 1);
 
         cy.fixture('user').then(user => {
             cy.request({
                method: 'POST',
                url: `http://localhost:8081/orders`,
                headers: {
                   'Authorization': `Bearer ${authToken}`,
                   'Content-Type': 'application/json',
                },
                body: {
                   firstname: user.firstname,
                   lastname: user.lastname,
                   address: user.address,
                   zipCode: user.zipCode,
                   city: user.city
                }
             }).then(response => {
                expect(response.status).to.eq(200);
                expect(response.body.validated).to.be.true;
                expect(response.body.firstname).to.eq(user.firstname);
                cy.getCartViaApi().then(cartResponse => {
                    expect(cartResponse.status).to.eq(404);
                });
             });
         });
     });
 
     it('GET /reviews - Should return list of reviews', () => {
         cy.request('GET', 'http://localhost:8081/reviews').then(response => {
             expect(response.status).to.eq(200);
             expect(response.body).to.be.an('array');
              if (response.body.length > 0) {
                 expect(response.body[0]).to.have.all.keys('id', 'date', 'title', 'comment', 'rating', 'author');
                 expect(response.body[0].author).to.include.keys('id', 'email', 'firstname', 'lastname');
              }
         });
     });
 
     it('POST /reviews - Should create a new review when authenticated', () => {
         expect(authToken).to.not.be.undefined;
         const reviewData = {
             title: `Test Review ${Date.now()}`,
             comment: 'This is an automated test review.',
             rating: 5
         };
 
         cy.request({
            method: 'POST',
            url: `http://localhost:8081/reviews`,
            headers: {
               'Authorization': `Bearer ${authToken}`,
               'Content-Type': 'application/json',
            },
            body: reviewData
         }).then(response => {
            expect(response.status).to.eq(200);
            expect(response.body.title).to.eq(reviewData.title);
            expect(response.body.comment).to.eq(reviewData.comment);
            expect(response.body.rating).to.eq(reviewData.rating);
            expect(response.body).to.have.property('author');
         });
     });
 
     it('POST /register - Should register a new user', () => {
       cy.fixture('user').then((user) => {
           const uniqueEmail = `newuser_${Date.now()}@test.fr`;
           cy.request({
             method: 'POST',
             url: 'http://localhost:8081/register',
             body: {
                 email: uniqueEmail,
                 plainPassword: { first: user.newUserPassword, second: user.newUserPassword },
                 firstname: user.newUserFirstname,
                 lastname: user.newUserLastname
             },
             headers: { 'Content-Type': 'application/json'}
           }).then((response) => {
               expect(response.status).to.eq(200);
               expect(response.body.email).to.eq(uniqueEmail);
           });
       });
     });
 
     it('POST /register - Should fail with duplicate email', () => {
       cy.fixture('user').then((user) => {
           cy.request({
             method: 'POST',
             url: 'http://localhost:8081/register',
             body: {
                 email: user.email, // Utilise l'email existant
                 plainPassword: { first: user.password, second: user.password },
                 firstname: user.firstname,
                 lastname: user.lastname
             },
             headers: { 'Content-Type': 'application/json'},
             failOnStatusCode: false
           }).then((response) => {
               expect(response.status).to.eq(400);
           });
       });
     });
 
     it('POST /reviews - Should accept script tags (detecting lack of sanitization)', () => {
         expect(authToken).to.not.be.undefined;
         const xssPayload = "<script>alert('XSS vulnerability test!')</script>";
         const reviewData = {
             title: `XSS Test Title ${Date.now()}`,
             comment: `Comment with payload: ${xssPayload}`,
             rating: 1
         };
 
         cy.request({
            method: 'POST',
            url: `http://localhost:8081/reviews`,
            headers: {
               'Authorization': `Bearer ${authToken}`,
               'Content-Type': 'application/json',
            },
            body: reviewData,
            failOnStatusCode: false
         }).then(response => {
             expect(response.status).to.eq(200, "API accepted review potentially containing XSS payload");
             expect(response.body.comment).to.contain(xssPayload, "Response body contains raw XSS payload");
         });
     });
 
 });